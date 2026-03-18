using Microsoft.EntityFrameworkCore;
using MtpApp.Data;
using MtpApp.Models;
using MtpApp.Services;
using Xunit;

namespace MtpApp.Tests.Services;

/// <summary>
/// Unit tests for <see cref="CustomerService"/>.
/// Each test runs against an isolated in-memory database.
/// </summary>
public class CustomerServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly CustomerService _sut;

    // A pre-seeded organization ID used across tests
    private const string OrgId = "org-test-001";

    public CustomerServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);
        _sut = new CustomerService(_db);

        // Seed a test organization so FK constraints are satisfied
        _db.Organizations.Add(new Organization
        {
            Id = OrgId,
            Name = "Test Org",
            Slug = "test-org",
            Email = "test@org.com"
        });
        _db.SaveChanges();
    }

    // ── CreateCustomerAsync ────────────────────────────────────────────────

    [Fact]
    public async Task CreateCustomerAsync_WithValidData_PersistsCustomer()
    {
        var dto = new CreateCustomerDto(
            FirstName: "Maria",
            LastName: "Lopez",
            Phone: "555-1234",
            OrganizationId: OrgId
        );

        var customer = await _sut.CreateCustomerAsync(dto);

        Assert.NotNull(customer);
        Assert.Equal("Maria", customer.FirstName);
        Assert.Equal("Lopez", customer.LastName);
        Assert.False(customer.IsBlocked);
        Assert.False(customer.CtrFlag);
        Assert.Equal(OrgId, customer.OrganizationId);
    }

    [Fact]
    public async Task CreateCustomerAsync_TrimsWhitespace_FromNameAndPhone()
    {
        var dto = new CreateCustomerDto(
            FirstName: "  Maria  ",
            LastName: "  Lopez  ",
            Phone: "  555-1234  ",
            OrganizationId: OrgId
        );

        var customer = await _sut.CreateCustomerAsync(dto);

        Assert.Equal("Maria", customer.FirstName);
        Assert.Equal("Lopez", customer.LastName);
        Assert.Equal("555-1234", customer.Phone);
    }

    [Theory]
    [InlineData("", "Lopez", "555")]        // missing first name
    [InlineData("Maria", "", "555")]        // missing last name
    [InlineData("Maria", "Lopez", "")]      // missing phone
    public async Task CreateCustomerAsync_WithMissingRequiredField_ThrowsArgumentException(
        string first, string last, string phone)
    {
        var dto = new CreateCustomerDto(first, last, phone, OrgId);

        await Assert.ThrowsAsync<ArgumentException>(() => _sut.CreateCustomerAsync(dto));
    }

    [Fact]
    public async Task CreateCustomerAsync_WithOptionalIdFields_PersistsThem()
    {
        var expiry = new DateTime(2028, 6, 30, 0, 0, 0, DateTimeKind.Utc);
        var dto = new CreateCustomerDto(
            FirstName: "Carlos",
            LastName: "Gomez",
            Phone: "555-9999",
            OrganizationId: OrgId,
            IdType: IdType.Passport,
            IdNumber: "A12345678",
            IdIssuedBy: "Mexico",
            IdExpiresAt: expiry
        );

        var customer = await _sut.CreateCustomerAsync(dto);

        Assert.Equal(IdType.Passport, customer.IdType);
        Assert.Equal("A12345678", customer.IdNumber);
        Assert.Equal(expiry, customer.IdExpiresAt);
    }

    // ── GetCustomersAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task GetCustomersAsync_ReturnsOnlyCustomersForOrg()
    {
        // Seed a second org and a customer belonging to it
        _db.Organizations.Add(new Organization
        {
            Id = "other-org", Name = "Other", Slug = "other", Email = "other@org.com"
        });
        _db.Customers.Add(new Customer
        {
            FirstName = "Bob", LastName = "Smith", Phone = "111", OrganizationId = "other-org"
        });

        // Add a customer to our test org
        var dto = new CreateCustomerDto("Alice", "Johnson", "222", OrgId);
        await _sut.CreateCustomerAsync(dto);

        // Should only return the one belonging to OrgId
        var results = await _sut.GetCustomersAsync(OrgId);

        Assert.Single(results);
        Assert.Equal("Alice", results[0].FirstName);
    }

    [Fact]
    public async Task GetCustomersAsync_WithSearchQuery_FiltersResults()
    {
        await _sut.CreateCustomerAsync(new CreateCustomerDto("Maria", "Lopez", "555-1111", OrgId));
        await _sut.CreateCustomerAsync(new CreateCustomerDto("Carlos", "Gomez", "555-2222", OrgId));
        await _sut.CreateCustomerAsync(new CreateCustomerDto("Ana", "Martinez", "555-3333", OrgId));

        // Search by first name (case-insensitive)
        var results = await _sut.GetCustomersAsync(OrgId, "maria");

        Assert.Single(results);
        Assert.Equal("Maria", results[0].FirstName);
    }

    [Fact]
    public async Task GetCustomersAsync_WithPhoneSearch_FindsCustomer()
    {
        await _sut.CreateCustomerAsync(new CreateCustomerDto("Maria", "Lopez", "555-1234", OrgId));
        await _sut.CreateCustomerAsync(new CreateCustomerDto("Carlos", "Gomez", "555-9999", OrgId));

        var results = await _sut.GetCustomersAsync(OrgId, "555-9999");

        Assert.Single(results);
        Assert.Equal("Carlos", results[0].FirstName);
    }

    [Fact]
    public async Task GetCustomersAsync_ReturnsResultsOrderedByLastNameThenFirstName()
    {
        await _sut.CreateCustomerAsync(new CreateCustomerDto("Carlos", "Gomez", "111", OrgId));
        await _sut.CreateCustomerAsync(new CreateCustomerDto("Ana", "Gomez", "222", OrgId));
        await _sut.CreateCustomerAsync(new CreateCustomerDto("Maria", "Lopez", "333", OrgId));

        var results = await _sut.GetCustomersAsync(OrgId);

        Assert.Equal("Ana", results[0].FirstName);     // Gomez, Ana
        Assert.Equal("Carlos", results[1].FirstName);  // Gomez, Carlos
        Assert.Equal("Maria", results[2].FirstName);   // Lopez, Maria
    }

    // ── GetCustomerAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task GetCustomerAsync_WithValidId_ReturnsCustomer()
    {
        var created = await _sut.CreateCustomerAsync(new CreateCustomerDto("Maria", "Lopez", "555", OrgId));

        var result = await _sut.GetCustomerAsync(created.Id, OrgId);

        Assert.NotNull(result);
        Assert.Equal(created.Id, result.Id);
    }

    [Fact]
    public async Task GetCustomerAsync_WithWrongOrgId_ReturnsNull()
    {
        var created = await _sut.CreateCustomerAsync(new CreateCustomerDto("Maria", "Lopez", "555", OrgId));

        // Try to access with a different org ID — should return null (cross-org isolation)
        var result = await _sut.GetCustomerAsync(created.Id, "different-org");

        Assert.Null(result);
    }

    // ── BlockCustomerAsync ─────────────────────────────────────────────────

    [Fact]
    public async Task BlockCustomerAsync_SetsIsBlockedAndReason()
    {
        var created = await _sut.CreateCustomerAsync(new CreateCustomerDto("Maria", "Lopez", "555", OrgId));

        var blocked = await _sut.BlockCustomerAsync(created.Id, OrgId, "Suspected fraud");

        Assert.True(blocked.IsBlocked);
        Assert.Equal("Suspected fraud", blocked.BlockedReason);
    }

    [Fact]
    public async Task BlockCustomerAsync_WithInvalidId_ThrowsKeyNotFoundException()
    {
        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            _sut.BlockCustomerAsync("non-existent-id", OrgId, "reason"));
    }

    public void Dispose() => _db.Dispose();
}
