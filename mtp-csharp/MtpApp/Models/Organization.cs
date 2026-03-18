using System.ComponentModel.DataAnnotations;

namespace MtpApp.Models;

/// <summary>
/// Top-level tenant. Every user, location, customer, and transaction
/// belongs to exactly one Organization.
/// </summary>
public class Organization
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    /// <summary>URL-safe unique identifier used in links (e.g. "acme-transfers").</summary>
    [Required, MaxLength(200)]
    public string Slug { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(30)]
    public string? Phone { get; set; }

    [MaxLength(300)]
    public string? Address { get; set; }

    [MaxLength(100)]
    public string? City { get; set; }

    [MaxLength(50)]
    public string? State { get; set; }

    [MaxLength(20)]
    public string? Zip { get; set; }

    [MaxLength(2)]
    public string Country { get; set; } = "US";

    // Stripe billing fields
    public string? StripeCustomerId { get; set; }
    public string? SubscriptionId { get; set; }
    public SubscriptionStatus SubscriptionStatus { get; set; } = SubscriptionStatus.Trial;
    public DateTime? TrialEndsAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<Location> Locations { get; set; } = [];
    public ICollection<User> Users { get; set; } = [];
    public ICollection<Customer> Customers { get; set; } = [];
    public ICollection<Transaction> Transactions { get; set; } = [];
    public ICollection<CompanyConfig> CompanyConfigs { get; set; } = [];
}
