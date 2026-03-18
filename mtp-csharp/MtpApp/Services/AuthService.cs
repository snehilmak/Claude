using Microsoft.EntityFrameworkCore;
using MtpApp.Data;
using MtpApp.Models;

namespace MtpApp.Services;

/// <summary>
/// Concrete implementation of <see cref="IAuthService"/>.
/// Uses BCrypt for password hashing and a DB-backed session token for auth.
/// </summary>
public class AuthService : IAuthService
{
    private readonly AppDbContext _db;

    // Sessions last 30 days by default
    private static readonly TimeSpan SessionDuration = TimeSpan.FromDays(30);

    public AuthService(AppDbContext db)
    {
        _db = db;
    }

    /// <inheritdoc/>
    public async Task<AuthResult> RegisterAsync(string orgName, string userName, string email, string password)
    {
        // Validate inputs
        if (string.IsNullOrWhiteSpace(orgName)) throw new ArgumentException("Organization name is required.", nameof(orgName));
        if (string.IsNullOrWhiteSpace(userName)) throw new ArgumentException("User name is required.", nameof(userName));
        if (string.IsNullOrWhiteSpace(email)) throw new ArgumentException("Email is required.", nameof(email));
        if (password.Length < 8) throw new ArgumentException("Password must be at least 8 characters.", nameof(password));

        var normalizedEmail = email.Trim().ToLowerInvariant();

        // Check for duplicate email
        if (await _db.Users.AnyAsync(u => u.Email == normalizedEmail))
            throw new InvalidOperationException("An account with this email already exists.");

        // Generate a unique URL slug for the organization
        var slug = await GenerateUniqueSlugAsync(orgName);

        // Hash password with BCrypt (work factor 11 is a good default)
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 11);

        // Create the organization, default location, and owner user atomically
        var trialEndsAt = DateTime.UtcNow.AddDays(14);

        var org = new Organization
        {
            Name = orgName.Trim(),
            Slug = slug,
            Email = normalizedEmail,
            TrialEndsAt = trialEndsAt,
            SubscriptionStatus = SubscriptionStatus.Trial
        };
        _db.Organizations.Add(org);

        // Every new org gets a default "Main Location"
        var location = new Location
        {
            Name = "Main Location",
            OrganizationId = org.Id
        };
        _db.Locations.Add(location);

        // Owner is the first user — has full access
        var user = new User
        {
            Name = userName.Trim(),
            Email = normalizedEmail,
            PasswordHash = passwordHash,
            Role = UserRole.Owner,
            OrganizationId = org.Id,
            LocationId = location.Id
        };
        _db.Users.Add(user);

        await _db.SaveChangesAsync();

        // Create and return a session
        var token = await CreateSessionAsync(user.Id);
        return new AuthResult(user, token);
    }

    /// <inheritdoc/>
    public async Task<AuthResult?> LoginAsync(string email, string password)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();

        // Load user — return null on bad email (don't reveal which field is wrong)
        var user = await _db.Users
            .Include(u => u.Organization)
            .Include(u => u.Location)
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user == null) return null;

        // Verify password using BCrypt constant-time comparison
        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash)) return null;

        var token = await CreateSessionAsync(user.Id);
        return new AuthResult(user, token);
    }

    /// <inheritdoc/>
    public async Task<User?> GetSessionUserAsync(string token)
    {
        var session = await _db.Sessions
            .Include(s => s.User)
                .ThenInclude(u => u.Organization)
            .Include(s => s.User)
                .ThenInclude(u => u.Location)
            .FirstOrDefaultAsync(s => s.Token == token);

        // Treat missing or expired sessions the same — caller sees null
        if (session == null || session.ExpiresAt < DateTime.UtcNow) return null;

        return session.User;
    }

    /// <inheritdoc/>
    public async Task LogoutAsync(string token)
    {
        var session = await _db.Sessions.FirstOrDefaultAsync(s => s.Token == token);
        if (session != null)
        {
            _db.Sessions.Remove(session);
            await _db.SaveChangesAsync();
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /// <summary>Creates a new session record and returns the opaque token.</summary>
    private async Task<string> CreateSessionAsync(string userId)
    {
        var session = new Session
        {
            UserId = userId,
            Token = Guid.NewGuid().ToString("N"), // 32-char hex token
            ExpiresAt = DateTime.UtcNow.Add(SessionDuration)
        };
        _db.Sessions.Add(session);
        await _db.SaveChangesAsync();
        return session.Token;
    }

    /// <summary>
    /// Converts an org name to a URL-safe slug and appends a suffix if it's taken.
    /// Example: "Acme Transfers!" → "acme-transfers", then "acme-transfers-2" if taken.
    /// </summary>
    private async Task<string> GenerateUniqueSlugAsync(string name)
    {
        // Replace non-alphanumeric chars with hyphens, lowercase, trim edges
        var baseSlug = System.Text.RegularExpressions.Regex
            .Replace(name.ToLowerInvariant(), @"[^a-z0-9]+", "-")
            .Trim('-');

        var slug = baseSlug;
        var attempt = 1;

        while (await _db.Organizations.AnyAsync(o => o.Slug == slug))
        {
            attempt++;
            slug = $"{baseSlug}-{attempt}";
        }

        return slug;
    }
}
