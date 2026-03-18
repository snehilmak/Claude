using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using MtpApp.Services;

namespace MtpApp.Pages;

/// <summary>
/// Handles new account registration. Creates the Organization, default Location,
/// and Owner User in a single operation, then auto-logs in the user.
/// </summary>
public class RegisterModel : PageModel
{
    private readonly IAuthService _auth;
    private const string CookieName = "mtp_session";

    public RegisterModel(IAuthService auth)
    {
        _auth = auth;
    }

    [BindProperty] public string OrgName { get; set; } = string.Empty;
    [BindProperty] public string UserName { get; set; } = string.Empty;
    [BindProperty] public string Email { get; set; } = string.Empty;
    [BindProperty] public string Password { get; set; } = string.Empty;

    public string? ErrorMessage { get; set; }

    public void OnGet() { }

    public async Task<IActionResult> OnPostAsync()
    {
        // Basic client-side validation is replicated server-side as a safety net
        if (string.IsNullOrWhiteSpace(OrgName) || string.IsNullOrWhiteSpace(UserName) ||
            string.IsNullOrWhiteSpace(Email) || string.IsNullOrWhiteSpace(Password))
        {
            ErrorMessage = "All fields are required.";
            return Page();
        }

        if (Password.Length < 8)
        {
            ErrorMessage = "Password must be at least 8 characters.";
            return Page();
        }

        try
        {
            var result = await _auth.RegisterAsync(OrgName, UserName, Email, Password);

            // Auto-login after registration — same cookie as login flow
            Response.Cookies.Append(CookieName, result.SessionToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Lax,
                Expires = DateTimeOffset.UtcNow.AddDays(30)
            });

            return RedirectToPage("/Dashboard/Index");
        }
        catch (InvalidOperationException ex)
        {
            // e.g. duplicate email
            ErrorMessage = ex.Message;
            return Page();
        }
        catch (ArgumentException ex)
        {
            ErrorMessage = ex.Message;
            return Page();
        }
    }
}
