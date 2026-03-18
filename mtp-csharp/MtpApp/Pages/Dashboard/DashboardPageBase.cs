using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using MtpApp.Models;
using MtpApp.Services;

namespace MtpApp.Pages.Dashboard;

/// <summary>
/// Base class for all dashboard pages. Validates the session cookie on every
/// request and populates <see cref="CurrentUser"/> before the handler runs.
/// Redirects to /login if the session is missing or expired.
/// </summary>
public abstract class DashboardPageBase : PageModel
{
    protected readonly IAuthService AuthService;
    private const string CookieName = "mtp_session";

    protected DashboardPageBase(IAuthService authService)
    {
        AuthService = authService;
    }

    /// <summary>The authenticated user for the current request. Never null on dashboard pages.</summary>
    public User CurrentUser { get; private set; } = null!;

    /// <summary>
    /// Call this at the start of every OnGet/OnPost handler.
    /// Returns a redirect result if the session is invalid, or null if authenticated.
    /// </summary>
    protected async Task<IActionResult?> RequireAuthAsync()
    {
        var token = Request.Cookies[CookieName];
        if (string.IsNullOrEmpty(token))
            return RedirectToPage("/Login");

        var user = await AuthService.GetSessionUserAsync(token);
        if (user == null)
        {
            // Session expired — clear the stale cookie
            Response.Cookies.Delete(CookieName);
            return RedirectToPage("/Login");
        }

        CurrentUser = user;
        return null; // null means "authenticated, proceed"
    }
}
