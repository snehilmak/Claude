using Microsoft.AspNetCore.Mvc;
using MtpApp.Models;
using MtpApp.Services;

namespace MtpApp.Pages.Dashboard.Customers;

/// <summary>Lists all customers for the organization with optional search.</summary>
public class IndexModel : DashboardPageBase
{
    private readonly ICustomerService _customers;

    public IndexModel(IAuthService auth, ICustomerService customers) : base(auth)
    {
        _customers = customers;
    }

    [BindProperty(SupportsGet = true)]
    public string? SearchQuery { get; set; }

    public List<Customer> Customers { get; private set; } = [];

    public async Task<IActionResult> OnGetAsync()
    {
        var redirect = await RequireAuthAsync();
        if (redirect != null) return redirect;

        Customers = await _customers.GetCustomersAsync(CurrentUser.OrganizationId, SearchQuery);
        return Page();
    }
}
