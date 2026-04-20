"""Budget & Billing resource managers.

Handles budget management, billing records, and usage tracking.
"""

from __future__ import annotations

from typing import Any

from .._api_client import ApiClient
from ..types import BillingAccount, BudgetStatus, UsageStats


class BudgetResource:
    """Budget management.

    Example::

        status = client.budget.get_status()
        can_run = client.budget.can_execute()
    """

    def __init__(self, client: ApiClient) -> None:
        self._client = client

    def get_status(self) -> BudgetStatus:
        """Get budget status via costs summary."""
        resp = self._client.get("/costs/summary")
        totals = resp.get("totals", {})
        return {
            "balance": 0,
            "spent": totals.get("totalCost", 0),
            "limit": 0,
            "remaining": 0,
        }

    def can_execute(self, estimated_cost: float | None = None) -> dict[str, Any]:
        """Check if execution is allowed given current budget.

        Budget checks are handled server-side during execution.
        """
        return {
            "canExecute": True,
            "reason": "Budget checks performed during execution",
        }

    def increase(
        self,
        amount: float,
        *,
        description: str | None = None,
        stripe_payment_intent_id: str | None = None,
        stripe_charge_id: str | None = None,
        payment_method: str | None = None,
    ) -> dict[str, Any]:
        """Increase budget."""
        body: dict[str, Any] = {"amount": amount}
        if description is not None:
            body["description"] = description
        if stripe_payment_intent_id is not None:
            body["stripePaymentIntentId"] = stripe_payment_intent_id
        if stripe_charge_id is not None:
            body["stripeChargeId"] = stripe_charge_id
        if payment_method is not None:
            body["paymentMethod"] = payment_method
        return self._client.post("/budget/increase", body)

    def get_records(
        self,
        *,
        limit: int | None = None,
        offset: int | None = None,
        since: str | None = None,
        until: str | None = None,
        type: str | None = None,
    ) -> dict[str, Any]:
        """Get billing records."""
        query: dict[str, Any] = {}
        if limit is not None:
            query["limit"] = limit
        if offset is not None:
            query["offset"] = offset
        if since is not None:
            query["since"] = since
        if until is not None:
            query["until"] = until
        if type is not None:
            query["type"] = type
        resp = self._client.get("/billing/records", query=query or None)
        return {
            "records": resp["data"],
            "pagination": {
                "total": resp.get("total_count", 0),
                "limit": limit or 50,
                "offset": offset or 0,
            },
        }

    def get_summary(self) -> dict[str, Any]:
        """Get billing summary."""
        return self._client.get("/billing/summary")

    def get_daily_spending(self) -> dict[str, Any]:
        """Get daily spending breakdown."""
        return self._client.get("/billing/daily")

    def record_mcp_usage(
        self,
        server_type: str,
        *,
        reference_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Record MCP server usage."""
        body: dict[str, Any] = {"serverType": server_type}
        if reference_id is not None:
            body["referenceId"] = reference_id
        if metadata is not None:
            body["metadata"] = metadata
        self._client.post("/billing/mcp-usage", body)

    # =========================================================================
    # Payment Integration
    # =========================================================================

    def get_topup_options(self) -> dict[str, Any]:
        """Get available top-up options."""
        return self._client.get("/budget/topup-options")

    def create_checkout(
        self,
        variant_id: str,
        *,
        user_email: str | None = None,
        user_name: str | None = None,
        redirect_url: str | None = None,
    ) -> dict[str, str]:
        """Create a checkout session for adding funds."""
        body: dict[str, Any] = {"variantId": variant_id}
        if user_email is not None:
            body["userEmail"] = user_email
        if user_name is not None:
            body["userName"] = user_name
        if redirect_url is not None:
            body["redirectUrl"] = redirect_url
        return self._client.post("/budget/checkout", body)

    def get_payment_status(self) -> dict[str, Any]:
        """Get payment integration status."""
        return self._client.get("/budget/payment-status")


class BillingResource:
    """Billing and usage tracking.

    Example::

        stats = client.billing.get_stats(period="month")
        account = client.billing.get_account()
    """

    def __init__(self, client: ApiClient) -> None:
        self._client = client

    def get_account(self) -> BillingAccount:
        """Get billing account information."""
        resp = self._client.get("/billing/account")
        return resp["account"]

    def get_stats(
        self,
        *,
        period: str | None = None,
        breakdown: str | None = None,
    ) -> UsageStats:
        """Get usage statistics."""
        query: dict[str, Any] = {}
        if period is not None:
            query["period"] = period
        if breakdown is not None:
            query["breakdown"] = breakdown
        resp = self._client.get("/billing/stats", query=query or None)
        return resp["stats"]

    def get_workspace_usage(self) -> dict[str, Any]:
        """Get workspace usage breakdown."""
        return self._client.get("/billing/usage/workspace")

    def get_transactions(
        self,
        *,
        from_date: str | None = None,
        to_date: str | None = None,
        type: str | None = None,
        limit: int | None = None,
        offset: int | None = None,
    ) -> dict[str, Any]:
        """Get transaction history."""
        query: dict[str, Any] = {}
        if from_date is not None:
            query["from"] = from_date
        if to_date is not None:
            query["to"] = to_date
        if type is not None:
            query["type"] = type
        if limit is not None:
            query["limit"] = limit
        if offset is not None:
            query["offset"] = offset
        return self._client.get("/billing/transactions", query=query or None)
