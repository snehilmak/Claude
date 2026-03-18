using Microsoft.AspNetCore.Mvc;
using MtpApp.Models;
using MtpApp.Services;

namespace MtpApp.Pages.Dashboard;

/// <summary>
/// Dashboard home page — shows a summary of today's activity and recent transactions.
/// </summary>
public class IndexModel : DashboardPageBase
{
    private readonly ITransactionService _transactions;

    public IndexModel(IAuthService auth, ITransactionService transactions) : base(auth)
    {
        _transactions = transactions;
    }

    // ── View data ──────────────────────────────────────────────────────────

    public int TodayCount { get; private set; }
    public decimal TodayVolume { get; private set; }
    public int MonthCount { get; private set; }
    public int PendingCount { get; private set; }
    public List<Transaction> RecentTransactions { get; private set; } = [];

    public async Task<IActionResult> OnGetAsync()
    {
        // Validate session — redirect to login if expired
        var redirect = await RequireAuthAsync();
        if (redirect != null) return redirect;

        var orgId = CurrentUser.OrganizationId;
        var now = DateTime.UtcNow;

        // Load today's transactions
        var todayFilter = new TransactionFilter(orgId,
            From: now.Date,
            To: now.Date.AddDays(1));
        var todayTxns = await _transactions.GetTransactionsAsync(todayFilter);

        TodayCount = todayTxns.Count;
        TodayVolume = todayTxns.Where(t => t.Status != TransactionStatus.Cancelled).Sum(t => t.SendAmount);

        // Month count
        var monthFilter = new TransactionFilter(orgId,
            From: new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc));
        var monthTxns = await _transactions.GetTransactionsAsync(monthFilter);
        MonthCount = monthTxns.Count;

        // Pending count (across all time)
        var pendingFilter = new TransactionFilter(orgId, Status: TransactionStatus.Pending);
        var pendingTxns = await _transactions.GetTransactionsAsync(pendingFilter);
        PendingCount = pendingTxns.Count;

        // Recent 10 transactions for the table
        RecentTransactions = monthTxns.Take(10).ToList();

        return Page();
    }
}
