using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MtpApp.Models;

/// <summary>
/// Tracks active login sessions via a secure token stored in a cookie.
/// Sessions expire after a set period or when the user logs out.
/// </summary>
public class Session
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string UserId { get; set; } = string.Empty;

    /// <summary>The opaque token sent to the browser as a cookie value.</summary>
    [Required]
    public string Token { get; set; } = Guid.NewGuid().ToString();

    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}
