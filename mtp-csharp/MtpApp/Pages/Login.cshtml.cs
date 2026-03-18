using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using MtpApp.Services;

namespace MtpApp.Pages;

/// <summary>
/// Handles the login form. On success, writes the session token to a cookie
/// and redirects to the dashboard.
/// </summary>
public class LoginModel : PageModel
{
    private readonly IAuthService _auth;

    // Name of the cookie that carries the session token
    private const string CookieName = "mtp_session";

    public LoginModel(IAuthService auth)
    {
        _auth = auth;
    }

    [BindProperty]
    public string Email { get; set; } = string.Empty;

    [BindProperty]
    public string Password { get; set; } = string.Empty;

    /// <summary>Set when login fails — displayed as an error banner in the view.</summary>
    public string? ErrorMessage { get; set; }

    public void OnGet() { }

    /// <summary>Processes the submitted login form.</summary>
    public async Task<IActionResult> OnPostAsync()
    {
        if (string.IsNullOrWhiteSpace(Email) || string.IsNullOrWhiteSpace(Password))
        {
            ErrorMessage = "Email and password are required.";
            return Page();
        }

        var result = await _auth.LoginAsync(Email.Trim(), Password);

        if (result == null)
        {
            // Don't reveal whether it was the email or password that was wrong
            ErrorMessage = "Invalid email or password.";
            return Page();
        }

        // Write the session token as an HTTP-only cookie (not accessible from JavaScript)
        Response.Cookies.Append(CookieName, result.SessionToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddDays(30)
        });

        return RedirectToPage("/Dashboard/Index");
    }
}
