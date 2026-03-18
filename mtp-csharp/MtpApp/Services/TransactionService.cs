using Microsoft.EntityFrameworkCore;
using MtpApp.Data;
using MtpApp.Models;

namespace MtpApp.Services;

/// <summary>Concrete implementation of <see cref="ITransactionService"/>.</summary>
public class TransactionService : ITransactionService
{
    private readonly AppDbContext _db;

    // BSA/AML: transactions over this daily aggregate require a CTR filing
    private const decimal CtrThreshold = 1000m;

    public TransactionService(AppDbContext db)
    {
        _db = db;
    }

    /// <inheritdoc/>
    public async Task<List<Transaction>> GetTransactionsAsync(TransactionFilter filter)
    {
        var query = _db.Transactions
            .Include(t => t.Customer)
            .Include(t => t.Company)
            .Include(t => t.Agent)
            .Include(t => t.Location)
            .Where(t => t.OrganizationId == filter.OrganizationId);

        // Scope to a specific location when the user isn't viewing "all locations"
        if (!string.IsNullOrEmpty(filter.LocationId))
            query = query.Where(t => t.LocationId == filter.LocationId);

        if (filter.Status.HasValue)
            query = query.Where(t => t.Status == filter.Status.Value);

        if (!string.IsNullOrEmpty(filter.CompanyId))
            query = query.Where(t => t.CompanyId == filter.CompanyId);

        if (filter.From.HasValue)
            query = query.Where(t => t.CreatedAt >= filter.From.Value);

        if (filter.To.HasValue)
            query = query.Where(t => t.CreatedAt <= filter.To.Value);

        return await query
            .OrderByDescending(t => t.CreatedAt)
            .Take(200)
            .ToListAsync();
    }

    /// <inheritdoc/>
    public async Task<Transaction?> GetTransactionAsync(string transactionId, string organizationId)
    {
        return await _db.Transactions
            .Include(t => t.Customer)
            .Include(t => t.Company)
            .Include(t => t.Agent)
            .Include(t => t.Location)
            .FirstOrDefaultAsync(t => t.Id == transactionId && t.OrganizationId == organizationId);
    }

    /// <inheritdoc/>
    public async Task<Transaction> CreateTransactionAsync(CreateTransactionDto dto)
    {
        // Verify the customer belongs to this org and isn't blocked
        var customer = await _db.Customers
            .FirstOrDefaultAsync(c => c.Id == dto.CustomerId && c.OrganizationId == dto.OrganizationId)
            ?? throw new KeyNotFoundException("Customer not found.");

        if (customer.IsBlocked)
            throw new InvalidOperationException($"Customer is blocked: {customer.BlockedReason}");

        // Check daily aggregate for CTR flag
        var dailyTotal = await GetDailyAggregateAsync(dto.CustomerId, DateTime.UtcNow);
        var willExceedCtr = (dailyTotal + dto.SendAmount) >= CtrThreshold;

        // Flag the customer for CTR if threshold crossed
        if (willExceedCtr && !customer.CtrFlag)
        {
            customer.CtrFlag = true;
            customer.UpdatedAt = DateTime.UtcNow;
        }

        var transaction = new Transaction
        {
            CustomerId = dto.CustomerId,
            SenderPhone = customer.Phone, // Denormalized for quick lookup
            RecipientName = dto.RecipientName.Trim(),
            RecipientPhone = dto.RecipientPhone,
            RecipientCity = dto.RecipientCity,
            RecipientCountry = dto.RecipientCountry,
            CompanyId = dto.CompanyId,
            SendAmount = dto.SendAmount,
            ExchangeRate = dto.ExchangeRate,
            ReceiveAmount = dto.ReceiveAmount,
            ReceiveCurrency = dto.ReceiveCurrency,
            Fee = dto.Fee,
            TotalCollected = dto.TotalCollected,
            PaymentMethod = dto.PaymentMethod,
            ReferenceNumber = dto.ReferenceNumber,
            ControlNumber = dto.ControlNumber,
            PurposeOfTransfer = dto.PurposeOfTransfer,
            SourceOfFunds = dto.SourceOfFunds,
            Notes = dto.Notes,
            Status = TransactionStatus.Pending,
            OrganizationId = dto.OrganizationId,
            LocationId = dto.LocationId,
            AgentId = dto.AgentId
        };

        _db.Transactions.Add(transaction);
        await _db.SaveChangesAsync();
        return transaction;
    }

    /// <inheritdoc/>
    public async Task<Transaction> UpdateStatusAsync(
        string transactionId,
        string organizationId,
        TransactionStatus newStatus,
        string? cancelReason = null)
    {
        var transaction = await _db.Transactions
            .FirstOrDefaultAsync(t => t.Id == transactionId && t.OrganizationId == organizationId)
            ?? throw new KeyNotFoundException("Transaction not found.");

        transaction.Status = newStatus;
        transaction.UpdatedAt = DateTime.UtcNow;

        // Record cancellation details
        if (newStatus == TransactionStatus.Cancelled)
        {
            transaction.CancelledAt = DateTime.UtcNow;
            transaction.CancelReason = cancelReason;
        }

        await _db.SaveChangesAsync();
        return transaction;
    }

    /// <inheritdoc/>
    public async Task<decimal> GetDailyAggregateAsync(string customerId, DateTime date)
    {
        // Sum send amounts for this customer on the given calendar day (UTC)
        var dayStart = date.Date;
        var dayEnd = dayStart.AddDays(1);

        return await _db.Transactions
            .Where(t =>
                t.CustomerId == customerId &&
                t.CreatedAt >= dayStart &&
                t.CreatedAt < dayEnd &&
                t.Status != TransactionStatus.Cancelled)
            .SumAsync(t => t.SendAmount);
    }
}
