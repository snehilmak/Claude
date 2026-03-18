using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MtpApp.Data;
using MtpApp.Models;
using MtpApp.Services;

namespace MtpApp.Pages.Dashboard.Settings;

/// <summary>
/// Organization settings page — manages org info, locations, and team members.
/// Only Owners and Managers should access this page.
/// </summary>
public class IndexModel : DashboardPageBase
{
    private readonly AppDbContext _db;

    public IndexModel(IAuthService auth, AppDbContext db) : base(auth)
    {
        _db = db;
    }

    // ── Org form bindings ──────────────────────────────────────────────────

    [BindProperty] public string OrgName { get; set; } = string.Empty;
    [BindProperty] public string? OrgPhone { get; set; }
    [BindProperty] public string? OrgAddress { get; set; }
    [BindProperty] public string? OrgCity { get; set; }
    [BindProperty] public string? OrgState { get; set; }
    [BindProperty] public string? OrgZip { get; set; }

    // ── View data ──────────────────────────────────────────────────────────

    public List<Location> Locations { get; private set; } = [];
    public List<User> Users { get; private set; } = [];
    public string? SuccessMessage { get; private set; }

    public async Task<IActionResult> OnGetAsync()
    {
        var redirect = await RequireAuthAsync();
        if (redirect != null) return redirect;

        await LoadPageDataAsync();
        return Page();
    }

    /// <summary>Saves updated organization profile information.</summary>
    public async Task<IActionResult> OnPostSaveOrgAsync()
    {
        var redirect = await RequireAuthAsync();
        if (redirect != null) return redirect;

        var org = await _db.Organizations.FindAsync(CurrentUser.OrganizationId);
        if (org != null)
        {
            org.Name = OrgName.Trim();
            org.Phone = OrgPhone?.Trim();
            org.Address = OrgAddress?.Trim();
            org.City = OrgCity?.Trim();
            org.State = OrgState?.Trim();
            org.Zip = OrgZip?.Trim();
            org.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        SuccessMessage = "Organization updated successfully.";
        await LoadPageDataAsync();
        return Page();
    }

    /// <summary>Adds a new physical location for the organization.</summary>
    public async Task<IActionResult> OnPostAddLocationAsync(
        string locationName, string? locationAddress, string? licenseNumber)
    {
        var redirect = await RequireAuthAsync();
        if (redirect != null) return redirect;

        if (!string.IsNullOrWhiteSpace(locationName))
        {
            _db.Locations.Add(new Location
            {
                Name = locationName.Trim(),
                Address = locationAddress?.Trim(),
                LicenseNumber = licenseNumber?.Trim(),
                OrganizationId = CurrentUser.OrganizationId
            });
            await _db.SaveChangesAsync();
            SuccessMessage = $"Location '{locationName}' added.";
        }

        await LoadPageDataAsync();
        return Page();
    }

    /// <summary>Loads page data — called on GET and after every POST.</summary>
    private async Task LoadPageDataAsync()
    {
        var org = await _db.Organizations.FindAsync(CurrentUser.OrganizationId);
        if (org != null)
        {
            OrgName = org.Name;
            OrgPhone = org.Phone;
            OrgAddress = org.Address;
            OrgCity = org.City;
            OrgState = org.State;
            OrgZip = org.Zip;
        }

        Locations = await _db.Locations
            .Where(l => l.OrganizationId == CurrentUser.OrganizationId)
            .OrderBy(l => l.Name)
            .ToListAsync();

        Users = await _db.Users
            .Include(u => u.Location)
            .Where(u => u.OrganizationId == CurrentUser.OrganizationId)
            .OrderBy(u => u.Name)
            .ToListAsync();
    }
}
