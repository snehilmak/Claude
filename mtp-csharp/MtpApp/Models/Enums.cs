namespace MtpApp.Models;

/// <summary>Billing/subscription state for an Organization.</summary>
public enum SubscriptionStatus
{
    Trial,
    Active,
    PastDue,
    Canceled,
    Paused
}

/// <summary>Access level of a User within their Organization.</summary>
public enum UserRole
{
    Owner,   // Full access, manages billing and all locations
    Manager, // Full access to transactions/customers, limited settings
    Agent    // Transaction entry only, locked to their assigned location
}

/// <summary>Accepted government ID document types for customer verification.</summary>
public enum IdType
{
    Passport,
    DriversLicense,
    StateId,
    Matricula,
    Other
}

/// <summary>Lifecycle state of a money transfer transaction.</summary>
public enum TransactionStatus
{
    Pending,   // Created but not yet confirmed with the transfer company
    Sent,      // Submitted to the transfer company
    Paid,      // Recipient has collected the funds
    Cancelled, // Voided before payout
    Held       // Flagged for compliance review
}

/// <summary>How the sender paid for the transfer at the counter.</summary>
public enum PaymentMethod
{
    Cash,
    Debit,
    Check
}
