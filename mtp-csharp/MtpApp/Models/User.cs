using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MtpApp.Models;

/// <summary>
/// An employee account within an Organization.
/// Passwords are stored as bcrypt hashes — never plaintext.
/// </summary>
public class User
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    /// <summary>BCrypt hash of the user's password. Never store plaintext.</summary>
    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    public UserRole Role { get; set; } = UserRole.Agent;

    // Foreign keys
    [Required]
    public string OrganizationId { get; set; } = string.Empty;

    /// <summary>
    /// Optional location assignment. Agents must be assigned to a location;
    /// Owners and Managers may be null (access all locations).
    /// </summary>
    public string? LocationId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(OrganizationId))]
    public Organization Organization { get; set; } = null!;

    [ForeignKey(nameof(LocationId))]
    public Location? Location { get; set; }

    public ICollection<Transaction> Transactions { get; set; } = [];
    public ICollection<Session> Sessions { get; set; } = [];
}
