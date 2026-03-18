using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MtpApp.Models;

/// <summary>
/// A physical branch/counter of an Organization.
/// Users and transactions are scoped to a location.
/// </summary>
public class Location
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(300)]
    public string? Address { get; set; }

    [MaxLength(100)]
    public string? City { get; set; }

    [MaxLength(50)]
    public string? State { get; set; }

    [MaxLength(20)]
    public string? Zip { get; set; }

    [MaxLength(30)]
    public string? Phone { get; set; }

    /// <summary>State Money Services Business (MSB) license number.</summary>
    [MaxLength(100)]
    public string? LicenseNumber { get; set; }

    // Foreign key to Organization
    [Required]
    public string OrganizationId { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(OrganizationId))]
    public Organization Organization { get; set; } = null!;

    public ICollection<User> Users { get; set; } = [];
    public ICollection<Transaction> Transactions { get; set; } = [];
}
