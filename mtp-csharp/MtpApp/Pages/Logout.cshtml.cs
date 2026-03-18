using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using MtpApp.Services;

namespace MtpApp.Pages;

/// <summary>
/// POST-only endpoint that clears the session cookie and deletes the session
/// record from the database. Redirects to the login page.
/// </summary>
[IgnoreAntiforgeryToken] // CSRF is not a risk here — logout only clears client-side state
public class LogoutModel : PageModel
{
    private readonly IAuthService _auth;
    private const string CookieName = "mtp_session";

    public LogoutModel(IAuthService auth)
    {
        _auth = auth;
    }

    public async Task<IActionResult> OnPostAsync()
    {
        // Read the token from the cookie, delete the DB record, then clear the cookie
        var token = Request.Cookies[CookieName];
        if (!string.IsNullOrEmpty(token))
            await _auth.LogoutAsync(token);

        Response.Cookies.Delete(CookieName);
        return RedirectToPage("/Login");
    }
}
