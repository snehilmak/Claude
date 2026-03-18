using Microsoft.AspNetCore.Mvc.RazorPages;

namespace MtpApp.Pages;

/// <summary>Landing page — publicly accessible, no auth required.</summary>
public class IndexModel : PageModel
{
    /// <summary>Feature cards displayed in the features section of the landing page.</summary>
    public record Feature(string Icon, string Title, string Description);

    public IReadOnlyList<Feature> Features { get; } =
    [
        new("bi-arrow-left-right", "Transaction Tracking",
            "Monitor every transfer in real time. Track status, control numbers, and confirmation details across all your money transfer companies."),
        new("bi-people", "Customer Management",
            "Maintain a complete customer database with ID verification, compliance flags, and full transfer history per sender."),
        new("bi-globe", "Multi-Company Rates",
            "Work with Intermex, Vigo, Ria, Barri, Maxi, MoneyGram, ViaAmericas, and more — all from a single unified dashboard."),
        new("bi-file-earmark-bar-graph", "Compliance Reports",
            "Automatically flag CTR-eligible transactions over $1,000 daily aggregate. Generate audit-ready reports in seconds."),
        new("bi-shield-check", "Built-in Compliance",
            "Stay ahead of BSA/AML requirements with built-in SAR tracking, CTR reporting, and customer due diligence workflows."),
        new("bi-lightning-charge", "Fast & Reliable",
            "Process transfers in under 60 seconds. Optimized for the busy pace of your agency floor.")
    ];

    public void OnGet() { }
}
