using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MtpApp.Data;
using MtpApp.Models;
using MtpApp.Services;

namespace MtpApp.Pages.Dashboard.Transactions;

/// <summary>
/// Lists transactions with filtering by status, company, and date range.
/// Also handles inline status updates via POST.
/// </summary>
public class IndexModel : DashboardPageBase
{
    private readonly ITransactionService _transactions;
    private readonly AppDbContext _db;

    public IndexModel(IAuthService auth, ITransactionService transactions, AppDbContext db) : base(auth)
    {
        _transactions = transactions;
        _db = db;
    }

    // ── Filter bindings (from query string) ───────────────────────────────

    [BindProperty(SupportsGet = true)] public string? StatusFilter { get; set; }
    [BindProperty(SupportsGet = true)] public string? CompanyFilter { get; set; }
    [BindProperty(SupportsGet = true)] public string? From { get; set; }
    [BindProperty(SupportsGet = true)] public string? To { get; set; }

    // ── View data ──────────────────────────────────────────────────────────

    public List<Transaction> Transactions { get; private set; } = [];
    public List<TransferCompany> Companies { get; private set; } = [];

    public async Task<IActionResult> OnGetAsync()
    {
        var redirect = await RequireAuthAsync();
        if (redirect != null) return redirect;

        // Load company list for the filter dropdown
        Companies = await _db.TransferCompanies
            .Where(c => c.IsActive)
            .OrderBy(c => c.Name)
            .ToListAsync();

        // Build filter from query string parameters
        TransactionStatus? status = Enum.TryParse<TransactionStatus>(StatusFilter, out var s) ? s : null;
        DateTime? from = DateTime.TryParse(From, out var f) ? f.ToUniversalTime() : null;
        DateTime? to = DateTime.TryParse(To, out var t) ? t.AddDays(1).ToUniversalTime() : null; // inclusive end

        var filter = new TransactionFilter(
            OrganizationId: CurrentUser.OrganizationId,
            Status: status,
            CompanyId: CompanyFilter,
            From: from,
            To: to
        );

        Transactions = await _transactions.GetTransactionsAsync(filter);
        return Page();
    }

    /// <summary>Handles the inline status-update form on each transaction row.</summary>
    public async Task<IActionResult> OnPostUpdateStatusAsync(string id, string newStatus)
    {
        var redirect = await RequireAuthAsync();
        if (redirect != null) return redirect;

        if (Enum.TryParse<TransactionStatus>(newStatus, out var status))
        {
            await _transactions.UpdateStatusAsync(id, CurrentUser.OrganizationId, status);
        }

        // Redirect back to the same page (preserving filters via query string)
        return RedirectToPage();
    }
}
