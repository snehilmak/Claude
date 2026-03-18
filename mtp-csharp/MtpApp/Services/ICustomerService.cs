using MtpApp.Models;

namespace MtpApp.Services;

/// <summary>Input data for creating a new customer.</summary>
public record CreateCustomerDto(
    string FirstName,
    string LastName,
    string Phone,
    string OrganizationId,
    string? MiddleName = null,
    DateTime? DateOfBirth = null,
    string? Email = null,
    string? Address = null,
    string? City = null,
    string? State = null,
    string? Zip = null,
    string Country = "US",
    IdType? IdType = null,
    string? IdNumber = null,
    string? IdIssuedBy = null,
    DateTime? IdExpiresAt = null
);

/// <summary>Manages customer (sender) records for the agency.</summary>
public interface ICustomerService
{
    /// <summary>
    /// Returns customers for the given organization.
    /// Optionally filters by name or phone number (case-insensitive).
    /// </summary>
    Task<List<Customer>> GetCustomersAsync(string organizationId, string? searchQuery = null);

    /// <summary>Returns a single customer, or null if not found or belongs to a different org.</summary>
    Task<Customer?> GetCustomerAsync(string customerId, string organizationId);

    /// <summary>
    /// Creates a new customer record.
    /// Throws <see cref="ArgumentException"/> if required fields are missing.
    /// </summary>
    Task<Customer> CreateCustomerAsync(CreateCustomerDto dto);

    /// <summary>
    /// Blocks a customer so they cannot be used for new transactions.
    /// Only Managers and Owners can block customers.
    /// </summary>
    Task<Customer> BlockCustomerAsync(string customerId, string organizationId, string reason);
}
