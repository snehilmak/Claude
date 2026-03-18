using MtpApp.Models;

namespace MtpApp.Services;

/// <summary>Input data for creating a new transaction.</summary>
public record CreateTransactionDto(
    string CustomerId,
    string RecipientName,
    string RecipientCountry,
    string CompanyId,
    decimal SendAmount,
    decimal ExchangeRate,
    decimal ReceiveAmount,
    decimal Fee,
    decimal TotalCollected,
    string OrganizationId,
    string LocationId,
    string AgentId,
    string? RecipientPhone = null,
    string? RecipientCity = null,
    string? ReferenceNumber = null,
    string? ControlNumber = null,
    string? PurposeOfTransfer = null,
    string? SourceOfFunds = null,
    string? Notes = null,
    PaymentMethod PaymentMethod = PaymentMethod.Cash,
    string ReceiveCurrency = "MXN"
);

/// <summary>Filter options for listing transactions.</summary>
public record TransactionFilter(
    string OrganizationId,
    string? LocationId = null,
    TransactionStatus? Status = null,
    string? CompanyId = null,
    DateTime? From = null,
    DateTime? To = null
);

/// <summary>Manages money transfer transactions.</summary>
public interface ITransactionService
{
    /// <summary>Returns transactions matching the given filter, newest first.</summary>
    Task<List<Transaction>> GetTransactionsAsync(TransactionFilter filter);

    /// <summary>Returns a single transaction, or null if not found or wrong org.</summary>
    Task<Transaction?> GetTransactionAsync(string transactionId, string organizationId);

    /// <summary>
    /// Creates a new transaction.
    /// Throws <see cref="InvalidOperationException"/> if the customer is blocked.
    /// Throws <see cref="KeyNotFoundException"/> if customer is not found.
    /// </summary>
    Task<Transaction> CreateTransactionAsync(CreateTransactionDto dto);

    /// <summary>Updates the status of an existing transaction (e.g. Sent → Paid).</summary>
    Task<Transaction> UpdateStatusAsync(string transactionId, string organizationId, TransactionStatus newStatus, string? cancelReason = null);

    /// <summary>
    /// Returns the total send amount for a customer on a given day.
    /// Used to determine if a CTR must be filed (threshold: $1,000).
    /// </summary>
    Task<decimal> GetDailyAggregateAsync(string customerId, DateTime date);
}
