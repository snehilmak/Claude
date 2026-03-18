using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MtpApp.Data;
using MtpApp.Models;
using MtpApp.Services;

namespace MtpApp.Pages.Dashboard.Transactions;

/// <summary>Form for creating a new money transfer transaction.</summary>
public class NewModel : DashboardPageBase
{
    private readonly ITransactionService _transactions;
    private readonly ICustomerService _customers;
    private readonly AppDbContext _db;

    public NewModel(IAuthService auth, ITransactionService transactions,
                    ICustomerService customers, AppDbContext db) : base(auth)
    {
        _transactions = transactions;
        _customers = customers;
        _db = db;
    }

    // ── Form bindings ──────────────────────────────────────────────────────

    [BindProperty] public string CustomerId { get; set; } = string.Empty;
    [BindProperty] public string RecipientName { get; set; } = string.Empty;
    [BindProperty] public string RecipientCountry { get; set; } = string.Empty;
    [BindProperty] public string? RecipientPhone { get; set; }
    [BindProperty] public string CompanyId { get; set; } = string.Empty;
    [BindProperty] public decimal SendAmount { get; set; }
    [BindProperty] public decimal ExchangeRate { get; set; }
    [BindProperty] public decimal Fee { get; set; }
    [BindProperty] public string PaymentMethod { get; set; } = "Cash";
    [BindProperty] public string? ControlNumber { get; set; }
    [BindProperty] public string? ReferenceNumber { get; set; }
    [BindProperty] public string? PurposeOfTransfer { get; set; }
    [BindProperty] public string? SourceOfFunds { get; set; }
    [BindProperty] public string? Notes { get; set; }

    // ── View data ──────────────────────────────────────────────────────────

    public List<Customer> Customers { get; private set; } = [];
    public List<TransferCompany> Companies { get; private set; } = [];
    public string? ErrorMessage { get; private set; }

    public async Task<IActionResult> OnGetAsync()
    {
        var redirect = await RequireAuthAsync();
        if (redirect != null) return redirect;

        await LoadDropdownsAsync();
        return Page();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        var redirect = await RequireAuthAsync();
        if (redirect != null) return redirect;

        // Basic validation
        if (string.IsNullOrWhiteSpace(CustomerId) || string.IsNullOrWhiteSpace(RecipientName) ||
            string.IsNullOrWhiteSpace(RecipientCountry) || string.IsNullOrWhiteSpace(CompanyId) ||
            SendAmount <= 0 || ExchangeRate <= 0)
        {
            ErrorMessage = "Please fill in all required fields.";
            await LoadDropdownsAsync();
            return Page();
        }

        // Resolve the location for this transaction
        // Agents are locked to their assigned location; managers/owners can use any location
        var locationId = CurrentUser.LocationId
            ?? (await _db.Locations
                    .Where(l => l.OrganizationId == CurrentUser.OrganizationId)
                    .OrderBy(l => l.CreatedAt)
                    .Select(l => l.Id)
                    .FirstOrDefaultAsync())
            ?? string.Empty;

        if (string.IsNullOrEmpty(locationId))
        {
            ErrorMessage = "No location configured for this organization.";
            await LoadDropdownsAsync();
            return Page();
        }

        // Receive amount = send amount × exchange rate
        var receiveAmount = SendAmount * ExchangeRate;
        var totalCollected = SendAmount + Fee;
        var paymentMethod = Enum.Parse<PaymentMethod>(PaymentMethod);

        try
        {
            var dto = new CreateTransactionDto(
                CustomerId: CustomerId,
                RecipientName: RecipientName,
                RecipientCountry: RecipientCountry,
                CompanyId: CompanyId,
                SendAmount: SendAmount,
                ExchangeRate: ExchangeRate,
                ReceiveAmount: receiveAmount,
                Fee: Fee,
                TotalCollected: totalCollected,
                OrganizationId: CurrentUser.OrganizationId,
                LocationId: locationId,
                AgentId: CurrentUser.Id,
                RecipientPhone: RecipientPhone,
                ReferenceNumber: ReferenceNumber,
                ControlNumber: ControlNumber,
                PurposeOfTransfer: PurposeOfTransfer,
                SourceOfFunds: SourceOfFunds,
                Notes: Notes,
                PaymentMethod: paymentMethod
            );

            await _transactions.CreateTransactionAsync(dto);
            return RedirectToPage("/Dashboard/Transactions/Index");
        }
        catch (InvalidOperationException ex)
        {
            // e.g. customer is blocked
            ErrorMessage = ex.Message;
            await LoadDropdownsAsync();
            return Page();
        }
        catch (KeyNotFoundException ex)
        {
            ErrorMessage = ex.Message;
            await LoadDropdownsAsync();
            return Page();
        }
    }

    /// <summary>Loads customer and company lists for the form dropdowns.</summary>
    private async Task LoadDropdownsAsync()
    {
        Customers = await _customers.GetCustomersAsync(CurrentUser.OrganizationId);
        Companies = await _db.TransferCompanies
            .Where(c => c.IsActive)
            .OrderBy(c => c.Name)
            .ToListAsync();
    }
}
