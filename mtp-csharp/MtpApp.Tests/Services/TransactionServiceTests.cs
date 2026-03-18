using Microsoft.EntityFrameworkCore;
using MtpApp.Data;
using MtpApp.Models;
using MtpApp.Services;
using Xunit;

namespace MtpApp.Tests.Services;

/// <summary>
/// Unit tests for <see cref="TransactionService"/>.
/// Covers transaction creation, status updates, CTR threshold detection,
/// and filtering logic.
/// </summary>
public class TransactionServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly TransactionService _sut;

    // Fixed IDs used across tests
    private const string OrgId = "org-001";
    private const string LocationId = "loc-001";
    private const string AgentId = "agent-001";
    private const string CompanyId = "company-001";
    private const string CustomerId = "customer-001";

    public TransactionServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);
        _sut = new TransactionService(_db);

        SeedTestData();
    }

    /// <summary>Seeds the minimum data needed by FK constraints.</summary>
    private void SeedTestData()
    {
        var org = new Organization { Id = OrgId, Name = "Test Org", Slug = "test-org", Email = "test@org.com" };
        var location = new Location { Id = LocationId, Name = "Main", OrganizationId = OrgId };
        var agent = new User
        {
            Id = AgentId, Name = "Agent", Email = "agent@test.com",
            PasswordHash = "hash", OrganizationId = OrgId, LocationId = LocationId
        };
        var company = new TransferCompany { Id = CompanyId, Name = "Intermex", Code = "INTERMEX" };
        var customer = new Customer
        {
            Id = CustomerId, FirstName = "Maria", LastName = "Lopez",
            Phone = "555-1234", OrganizationId = OrgId
        };

        _db.AddRange(org, location, agent, company, customer);
        _db.SaveChanges();
    }

    /// <summary>Helper to build a standard CreateTransactionDto.</summary>
    private CreateTransactionDto MakeDto(decimal sendAmount = 200m, string? customerId = null) =>
        new(
            CustomerId: customerId ?? CustomerId,
            RecipientName: "Juan Lopez",
            RecipientCountry: "MX",
            CompanyId: CompanyId,
            SendAmount: sendAmount,
            ExchangeRate: 17.5m,
            ReceiveAmount: sendAmount * 17.5m,
            Fee: 5m,
            TotalCollected: sendAmount + 5m,
            OrganizationId: OrgId,
            LocationId: LocationId,
            AgentId: AgentId
        );

    // ── CreateTransactionAsync ─────────────────────────────────────────────

    [Fact]
    public async Task CreateTransactionAsync_WithValidData_PersistsTransaction()
    {
        var tx = await _sut.CreateTransactionAsync(MakeDto(300m));

        Assert.NotNull(tx);
        Assert.Equal(300m, tx.SendAmount);
        Assert.Equal(TransactionStatus.Pending, tx.Status);
        Assert.Equal(OrgId, tx.OrganizationId);
        Assert.Equal(LocationId, tx.LocationId);
        Assert.Equal(AgentId, tx.AgentId);
    }

    [Fact]
    public async Task CreateTransactionAsync_SetsRecipientReceiveAmount()
    {
        // ReceiveAmount should equal SendAmount × ExchangeRate
        var tx = await _sut.CreateTransactionAsync(MakeDto(200m));

        Assert.Equal(200m * 17.5m, tx.ReceiveAmount);
    }

    [Fact]
    public async Task CreateTransactionAsync_DenormalizesCustomerPhoneToTransaction()
    {
        var tx = await _sut.CreateTransactionAsync(MakeDto());

        // SenderPhone should be copied from Customer.Phone at creation time
        Assert.Equal("555-1234", tx.SenderPhone);
    }

    [Fact]
    public async Task CreateTransactionAsync_WithBlockedCustomer_ThrowsInvalidOperationException()
    {
        // Block the customer first
        var customer = await _db.Customers.FindAsync(CustomerId);
        Assert.NotNull(customer);
        customer.IsBlocked = true;
        customer.BlockedReason = "Fraud suspected";
        await _db.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.CreateTransactionAsync(MakeDto()));
    }

    [Fact]
    public async Task CreateTransactionAsync_WithNonExistentCustomer_ThrowsKeyNotFoundException()
    {
        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            _sut.CreateTransactionAsync(MakeDto(customerId: "does-not-exist")));
    }

    // ── CTR Threshold Detection ────────────────────────────────────────────

    [Fact]
    public async Task CreateTransactionAsync_WhenDailyTotalExceeds1000_SetsCtrFlag()
    {
        // First transaction: $600 — below threshold
        await _sut.CreateTransactionAsync(MakeDto(600m));

        // Check customer doesn't have CTR flag yet
        var customerBefore = await _db.Customers.FindAsync(CustomerId);
        Assert.NotNull(customerBefore);
        Assert.False(customerBefore.CtrFlag);

        // Second transaction: $500 — pushes daily total to $1,100 (above $1,000)
        await _sut.CreateTransactionAsync(MakeDto(500m));

        // Now the customer should be flagged for CTR
        var customerAfter = await _db.Customers.FindAsync(CustomerId);
        Assert.NotNull(customerAfter);
        Assert.True(customerAfter.CtrFlag);
    }

    [Fact]
    public async Task CreateTransactionAsync_WhenDailyTotalBelow1000_DoesNotSetCtrFlag()
    {
        await _sut.CreateTransactionAsync(MakeDto(400m));
        await _sut.CreateTransactionAsync(MakeDto(300m)); // total = $700

        var customer = await _db.Customers.FindAsync(CustomerId);
        Assert.NotNull(customer);
        Assert.False(customer.CtrFlag); // $700 < $1,000 — no CTR flag
    }

    // ── GetDailyAggregateAsync ─────────────────────────────────────────────

    [Fact]
    public async Task GetDailyAggregateAsync_SumsAllNonCancelledTransactionsForDay()
    {
        await _sut.CreateTransactionAsync(MakeDto(300m));
        await _sut.CreateTransactionAsync(MakeDto(200m));
        // Create a cancelled one — should NOT count
        var cancelled = await _sut.CreateTransactionAsync(MakeDto(500m));
        await _sut.UpdateStatusAsync(cancelled.Id, OrgId, TransactionStatus.Cancelled);

        var total = await _sut.GetDailyAggregateAsync(CustomerId, DateTime.UtcNow);

        Assert.Equal(500m, total); // 300 + 200, not + 500 (cancelled)
    }

    // ── UpdateStatusAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task UpdateStatusAsync_ChangesTransactionStatus()
    {
        var tx = await _sut.CreateTransactionAsync(MakeDto());

        var updated = await _sut.UpdateStatusAsync(tx.Id, OrgId, TransactionStatus.Sent);

        Assert.Equal(TransactionStatus.Sent, updated.Status);
    }

    [Fact]
    public async Task UpdateStatusAsync_WhenCancelling_SetsCancelledAtAndReason()
    {
        var tx = await _sut.CreateTransactionAsync(MakeDto());

        var updated = await _sut.UpdateStatusAsync(tx.Id, OrgId, TransactionStatus.Cancelled, "Customer request");

        Assert.Equal(TransactionStatus.Cancelled, updated.Status);
        Assert.NotNull(updated.CancelledAt);
        Assert.Equal("Customer request", updated.CancelReason);
    }

    [Fact]
    public async Task UpdateStatusAsync_WithWrongOrgId_ThrowsKeyNotFoundException()
    {
        var tx = await _sut.CreateTransactionAsync(MakeDto());

        // Trying to update with a different org ID should fail
        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            _sut.UpdateStatusAsync(tx.Id, "wrong-org", TransactionStatus.Sent));
    }

    // ── GetTransactionsAsync ───────────────────────────────────────────────

    [Fact]
    public async Task GetTransactionsAsync_ReturnsOnlyTransactionsForOrg()
    {
        await _sut.CreateTransactionAsync(MakeDto());

        var results = await _sut.GetTransactionsAsync(new TransactionFilter(OrgId));

        Assert.Single(results);
    }

    [Fact]
    public async Task GetTransactionsAsync_FiltersByStatus()
    {
        var tx1 = await _sut.CreateTransactionAsync(MakeDto());
        var tx2 = await _sut.CreateTransactionAsync(MakeDto());
        await _sut.UpdateStatusAsync(tx1.Id, OrgId, TransactionStatus.Sent);

        var sentResults = await _sut.GetTransactionsAsync(
            new TransactionFilter(OrgId, Status: TransactionStatus.Sent));

        Assert.Single(sentResults);
        Assert.Equal(tx1.Id, sentResults[0].Id);
    }

    [Fact]
    public async Task GetTransactionsAsync_ReturnsNewestFirst()
    {
        var tx1 = await _sut.CreateTransactionAsync(MakeDto(100m));
        await Task.Delay(10); // Ensure CreatedAt differs slightly
        var tx2 = await _sut.CreateTransactionAsync(MakeDto(200m));

        var results = await _sut.GetTransactionsAsync(new TransactionFilter(OrgId));

        // Most recent (tx2) should be first
        Assert.Equal(tx2.Id, results[0].Id);
    }

    public void Dispose() => _db.Dispose();
}
