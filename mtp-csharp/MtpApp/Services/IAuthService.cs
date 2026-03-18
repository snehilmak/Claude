using MtpApp.Models;

namespace MtpApp.Services;

/// <summary>Result returned after a successful login or register.</summary>
public record AuthResult(User User, string SessionToken);

/// <summary>
/// Handles all authentication operations: registration, login, session
/// validation, and logout.
/// </summary>
public interface IAuthService
{
    /// <summary>
    /// Creates a new Organization, a default Location, and an Owner User.
    /// Returns the session token to be stored in a cookie.
    /// Throws <see cref="InvalidOperationException"/> if the email is already in use.
    /// </summary>
    Task<AuthResult> RegisterAsync(string orgName, string userName, string email, string password);

    /// <summary>
    /// Validates credentials and returns a new session token.
    /// Returns null if the email or password is incorrect.
    /// </summary>
    Task<AuthResult?> LoginAsync(string email, string password);

    /// <summary>
    /// Looks up an active, non-expired session by its token.
    /// Returns the associated User (with Organization and Location loaded),
    /// or null if the session is missing or expired.
    /// </summary>
    Task<User?> GetSessionUserAsync(string token);

    /// <summary>Deletes the session record, effectively logging the user out.</summary>
    Task LogoutAsync(string token);
}
