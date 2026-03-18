using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MtpApp.Data;
using MtpApp.Models;
using MtpApp.Services;

namespace MtpApp.Pages.Dashboard.Reports;

/// <summary>View model row for CTR-flagged customer report.</summary>
public record CtrRow(Customer Customer, decimal DailyTotal);

/// <summary>View model row for the monthly volume-by-company breakdown.</summary>
public record CompanyRow(string CompanyName, int Count, decimal Volume, decimal Fees);

/// <summary>
/// Compliance reports page. Shows CTR-flagged customers and monthly volume
/// broken down by transfer company.
/// </summary>
public class IndexModel : DashboardPageBase
{
    private readonly AppDbContext _db;

    public IndexModel(IAuthService auth, AppDbContext db) : base(auth)
    {
        _db = db;
    }

    // ── View data ──────────────────────────────────────────────────────────

    public int MonthCount { get; private set; }
    public decimal MonthVolume { get; private set; }
    public List<CtrRow> CtrCustomers { get; private set; } = [];
    public List<CompanyRow> CompanyBreakdown { get; private set; } = [];

    public async Task<IActionResult> OnGetAsync()
    {
        var redirect = await RequireAuthAsync();
        if (redirect != null) return redirect;

        var orgId = CurrentUser.OrganizationId;
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var todayStart = now.Date;
        var todayEnd = todayStart.AddDays(1);

        // ── Monthly summary ────────────────────────────────────────────────

        var monthTxns = await _db.Transactions
            .Include(t => t.Company)
            .Where(t => t.OrganizationId == orgId &&
                        t.CreatedAt >= monthStart &&
                        t.Status != TransactionStatus.Cancelled)
            .ToListAsync();

        MonthCount = monthTxns.Count;
        MonthVolume = monthTxns.Sum(t => t.SendAmount);

        // ── CTR-flagged customers (today's aggregate >= $1,000) ────────────

        var todayTxns = await _db.Transactions
            .Include(t => t.Customer)
            .Where(t => t.OrganizationId == orgId &&
                        t.CreatedAt >= todayStart &&
                        t.CreatedAt < todayEnd &&
                        t.Status != TransactionStatus.Cancelled)
            .ToListAsync();

        // Group by customer and sum their daily totals
        CtrCustomers = todayTxns
            .GroupBy(t => t.CustomerId)
            .Select(g => new CtrRow(
                Customer: g.First().Customer,
                DailyTotal: g.Sum(t => t.SendAmount)
            ))
            .Where(r => r.DailyTotal >= 1000)
            .OrderByDescending(r => r.DailyTotal)
            .ToList();

        // ── Volume breakdown by company ────────────────────────────────────

        CompanyBreakdown = monthTxns
            .GroupBy(t => t.Company.Name)
            .Select(g => new CompanyRow(
                CompanyName: g.Key,
                Count: g.Count(),
                Volume: g.Sum(t => t.SendAmount),
                Fees: g.Sum(t => t.Fee)
            ))
            .OrderByDescending(r => r.Volume)
            .ToList();

        return Page();
    }
}
