using Microsoft.EntityFrameworkCore;
using MtpApp.Data;
using MtpApp.Models;

namespace MtpApp.Services;

/// <summary>Concrete implementation of <see cref="ICustomerService"/>.</summary>
public class CustomerService : ICustomerService
{
    private readonly AppDbContext _db;

    public CustomerService(AppDbContext db)
    {
        _db = db;
    }

    /// <inheritdoc/>
    public async Task<List<Customer>> GetCustomersAsync(string organizationId, string? searchQuery = null)
    {
        var query = _db.Customers
            .Where(c => c.OrganizationId == organizationId);

        // Apply optional search filter across name and phone fields
        if (!string.IsNullOrWhiteSpace(searchQuery))
        {
            var q = searchQuery.Trim().ToLower();
            query = query.Where(c =>
                c.FirstName.ToLower().Contains(q) ||
                c.LastName.ToLower().Contains(q) ||
                c.Phone.Contains(q));
        }

        return await query
            .OrderBy(c => c.LastName)
            .ThenBy(c => c.FirstName)
            .Take(200) // Safety cap to avoid loading massive result sets
            .ToListAsync();
    }

    /// <inheritdoc/>
    public async Task<Customer?> GetCustomerAsync(string customerId, string organizationId)
    {
        return await _db.Customers
            .FirstOrDefaultAsync(c => c.Id == customerId && c.OrganizationId == organizationId);
    }

    /// <inheritdoc/>
    public async Task<Customer> CreateCustomerAsync(CreateCustomerDto dto)
    {
        // Validate required fields
        if (string.IsNullOrWhiteSpace(dto.FirstName)) throw new ArgumentException("First name is required.");
        if (string.IsNullOrWhiteSpace(dto.LastName)) throw new ArgumentException("Last name is required.");
        if (string.IsNullOrWhiteSpace(dto.Phone)) throw new ArgumentException("Phone number is required.");

        var customer = new Customer
        {
            FirstName = dto.FirstName.Trim(),
            LastName = dto.LastName.Trim(),
            MiddleName = dto.MiddleName?.Trim(),
            DateOfBirth = dto.DateOfBirth,
            Phone = dto.Phone.Trim(),
            Email = dto.Email?.Trim(),
            Address = dto.Address?.Trim(),
            City = dto.City?.Trim(),
            State = dto.State?.Trim(),
            Zip = dto.Zip?.Trim(),
            Country = string.IsNullOrWhiteSpace(dto.Country) ? "US" : dto.Country,
            IdType = dto.IdType,
            IdNumber = dto.IdNumber?.Trim(),
            IdIssuedBy = dto.IdIssuedBy?.Trim(),
            IdExpiresAt = dto.IdExpiresAt,
            OrganizationId = dto.OrganizationId
        };

        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();
        return customer;
    }

    /// <inheritdoc/>
    public async Task<Customer> BlockCustomerAsync(string customerId, string organizationId, string reason)
    {
        var customer = await _db.Customers
            .FirstOrDefaultAsync(c => c.Id == customerId && c.OrganizationId == organizationId)
            ?? throw new KeyNotFoundException("Customer not found.");

        customer.IsBlocked = true;
        customer.BlockedReason = reason;
        customer.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return customer;
    }
}
