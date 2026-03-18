using Microsoft.EntityFrameworkCore;
using MtpApp.Data;
using MtpApp.Models;
using MtpApp.Services;
using Xunit;

namespace MtpApp.Tests.Services;

/// <summary>
/// Unit tests for <see cref="AuthService"/>.
/// Uses an in-memory SQLite database so no real DB is required.
/// </summary>
public class AuthServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly AuthService _sut; // System Under Test

    public AuthServiceTests()
    {
        // Each test gets a fresh in-memory database to avoid state leakage
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);
        _sut = new AuthService(_db);
    }

    // ── RegisterAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task RegisterAsync_WithValidData_CreatesOrgAndUser()
    {
        // Act
        var result = await _sut.RegisterAsync("Acme Transfers", "Jane Smith", "jane@example.com", "password123");

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result.SessionToken);
        Assert.Equal("jane@example.com", result.User.Email);
        Assert.Equal(UserRole.Owner, result.User.Role);

        // Verify org and default location were created
        var org = await _db.Organizations.FirstOrDefaultAsync();
        Assert.NotNull(org);
        Assert.Equal("Acme Transfers", org.Name);
        Assert.Equal(SubscriptionStatus.Trial, org.SubscriptionStatus);

        var location = await _db.Locations.FirstOrDefaultAsync();
        Assert.NotNull(location);
        Assert.Equal("Main Location", location.Name);
    }

    [Fact]
    public async Task RegisterAsync_WithDuplicateEmail_ThrowsInvalidOperationException()
    {
        // Arrange — register once first
        await _sut.RegisterAsync("Acme Transfers", "Jane", "jane@example.com", "password123");

        // Act & Assert — second registration with same email should throw
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.RegisterAsync("Other Co", "Bob", "jane@example.com", "password456"));
    }

    [Fact]
    public async Task RegisterAsync_WithShortPassword_ThrowsArgumentException()
    {
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _sut.RegisterAsync("Acme", "Jane", "jane@example.com", "short")); // less than 8 chars
    }

    [Fact]
    public async Task RegisterAsync_GeneratesUniqueSlug_WhenNameConflicts()
    {
        // Register two orgs with the same name
        await _sut.RegisterAsync("Acme Transfers", "Alice", "alice@example.com", "password123");
        var result2 = await _sut.RegisterAsync("Acme Transfers", "Bob", "bob@example.com", "password456");

        // Second org should get a suffixed slug (e.g. "acme-transfers-2")
        var org2 = await _db.Organizations.FirstOrDefaultAsync(o => o.Email == "bob@example.com");
        Assert.NotNull(org2);
        Assert.NotEqual("acme-transfers", org2.Slug); // must differ from first org
        Assert.StartsWith("acme-transfers", org2.Slug);
    }

    [Fact]
    public async Task RegisterAsync_HashesPassword_NotStoredAsPlaintext()
    {
        await _sut.RegisterAsync("Acme", "Jane", "jane@example.com", "mypassword");

        var user = await _db.Users.FirstOrDefaultAsync();
        Assert.NotNull(user);
        // The hash must never equal the plaintext
        Assert.NotEqual("mypassword", user.PasswordHash);
        // But BCrypt must be able to verify it
        Assert.True(BCrypt.Net.BCrypt.Verify("mypassword", user.PasswordHash));
    }

    // ── LoginAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task LoginAsync_WithCorrectCredentials_ReturnsAuthResult()
    {
        // Arrange
        await _sut.RegisterAsync("Acme", "Jane", "jane@example.com", "password123");

        // Act
        var result = await _sut.LoginAsync("jane@example.com", "password123");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("jane@example.com", result.User.Email);
        Assert.NotEmpty(result.SessionToken);
    }

    [Fact]
    public async Task LoginAsync_WithWrongPassword_ReturnsNull()
    {
        await _sut.RegisterAsync("Acme", "Jane", "jane@example.com", "password123");

        var result = await _sut.LoginAsync("jane@example.com", "wrongpassword");

        Assert.Null(result);
    }

    [Fact]
    public async Task LoginAsync_WithUnknownEmail_ReturnsNull()
    {
        var result = await _sut.LoginAsync("nobody@example.com", "password123");
        Assert.Null(result);
    }

    [Fact]
    public async Task LoginAsync_IsCaseInsensitiveForEmail()
    {
        await _sut.RegisterAsync("Acme", "Jane", "jane@example.com", "password123");

        // Login with uppercase email should still work
        var result = await _sut.LoginAsync("JANE@EXAMPLE.COM", "password123");
        Assert.NotNull(result);
    }

    // ── GetSessionUserAsync ────────────────────────────────────────────────

    [Fact]
    public async Task GetSessionUserAsync_WithValidToken_ReturnsUser()
    {
        var registered = await _sut.RegisterAsync("Acme", "Jane", "jane@example.com", "password123");

        var user = await _sut.GetSessionUserAsync(registered.SessionToken);

        Assert.NotNull(user);
        Assert.Equal("jane@example.com", user.Email);
        Assert.NotNull(user.Organization); // navigation property loaded
    }

    [Fact]
    public async Task GetSessionUserAsync_WithInvalidToken_ReturnsNull()
    {
        var user = await _sut.GetSessionUserAsync("this-token-does-not-exist");
        Assert.Null(user);
    }

    [Fact]
    public async Task GetSessionUserAsync_WithExpiredSession_ReturnsNull()
    {
        // Arrange — manually create an expired session in the DB
        var registered = await _sut.RegisterAsync("Acme", "Jane", "jane@example.com", "password123");
        var session = await _db.Sessions.FirstOrDefaultAsync(s => s.Token == registered.SessionToken);
        Assert.NotNull(session);

        // Wind the expiry back to the past
        session.ExpiresAt = DateTime.UtcNow.AddDays(-1);
        await _db.SaveChangesAsync();

        // Act
        var user = await _sut.GetSessionUserAsync(registered.SessionToken);

        // Assert — expired session should return null
        Assert.Null(user);
    }

    // ── LogoutAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task LogoutAsync_DeletesSession_TokenNoLongerValid()
    {
        var registered = await _sut.RegisterAsync("Acme", "Jane", "jane@example.com", "password123");

        await _sut.LogoutAsync(registered.SessionToken);

        // After logout the token should no longer resolve to a user
        var user = await _sut.GetSessionUserAsync(registered.SessionToken);
        Assert.Null(user);
    }

    [Fact]
    public async Task LogoutAsync_WithNonExistentToken_DoesNotThrow()
    {
        // Should be a no-op, not throw an exception
        await _sut.LogoutAsync("invalid-token-that-doesnt-exist");
    }

    public void Dispose() => _db.Dispose();
}
