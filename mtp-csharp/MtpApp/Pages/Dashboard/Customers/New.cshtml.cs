using Microsoft.AspNetCore.Mvc;
using MtpApp.Models;
using MtpApp.Services;

namespace MtpApp.Pages.Dashboard.Customers;

/// <summary>Form to add a new customer (sender) to the organization.</summary>
public class NewModel : DashboardPageBase
{
    private readonly ICustomerService _customers;

    public NewModel(IAuthService auth, ICustomerService customers) : base(auth)
    {
        _customers = customers;
    }

    // ── Form bindings ──────────────────────────────────────────────────────

    [BindProperty] public string FirstName { get; set; } = string.Empty;
    [BindProperty] public string LastName { get; set; } = string.Empty;
    [BindProperty] public string? MiddleName { get; set; }
    [BindProperty] public string Phone { get; set; } = string.Empty;
    [BindProperty] public string? Email { get; set; }
    [BindProperty] public DateTime? DateOfBirth { get; set; }
    [BindProperty] public string? Address { get; set; }
    [BindProperty] public string? City { get; set; }
    [BindProperty] public string? State { get; set; }
    [BindProperty] public string? Zip { get; set; }
    [BindProperty] public string? IdType { get; set; }
    [BindProperty] public string? IdNumber { get; set; }
    [BindProperty] public string? IdIssuedBy { get; set; }
    [BindProperty] public DateTime? IdExpiresAt { get; set; }

    public string? ErrorMessage { get; private set; }

    public async Task<IActionResult> OnGetAsync()
    {
        var redirect = await RequireAuthAsync();
        if (redirect != null) return redirect;
        return Page();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        var redirect = await RequireAuthAsync();
        if (redirect != null) return redirect;

        IdType? idType = Enum.TryParse<IdType>(IdType, out var parsed) ? parsed : null;

        try
        {
            var dto = new CreateCustomerDto(
                FirstName: FirstName,
                LastName: LastName,
                Phone: Phone,
                OrganizationId: CurrentUser.OrganizationId,
                MiddleName: MiddleName,
                DateOfBirth: DateOfBirth,
                Email: Email,
                Address: Address,
                City: City,
                State: State,
                Zip: Zip,
                IdType: idType,
                IdNumber: IdNumber,
                IdIssuedBy: IdIssuedBy,
                IdExpiresAt: IdExpiresAt
            );

            await _customers.CreateCustomerAsync(dto);
            return RedirectToPage("/Dashboard/Customers/Index");
        }
        catch (ArgumentException ex)
        {
            ErrorMessage = ex.Message;
            return Page();
        }
    }
}
