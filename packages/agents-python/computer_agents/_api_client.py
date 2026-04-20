"""Low-level HTTP client for the Computer Agents Cloud API.

Handles authentication, request/response processing, SSE streaming,
and error handling. Higher-level resource managers use this client.
"""

from __future__ import annotations

import json
from typing import Any, Generator, Iterator

import httpx

from ._exceptions import ApiClientError


DEFAULT_BASE_URL = "https://api.computer-agents.com"
DEFAULT_TIMEOUT = 60.0  # seconds


class ApiClient:
    """Low-level HTTP client for the Computer Agents API.

    Args:
        api_key: API key for authentication.
        base_url: Base URL for the API. Defaults to ``https://api.computer-agents.com``.
        timeout: Request timeout in seconds. Defaults to 60.
        debug: Enable debug logging. Defaults to False.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str | None = None,
        timeout: float | None = None,
        debug: bool = False,
    ) -> None:
        if not api_key:
            raise ValueError(
                "API key is required. Provide it via:\n"
                '1. Constructor: ApiClient(api_key="...")\n'
                "2. Environment variable: COMPUTER_AGENTS_API_KEY"
            )

        self._api_key = api_key
        self._base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")
        self._timeout = timeout or DEFAULT_TIMEOUT
        self._debug = debug

        self._client = httpx.Client(
            base_url=self._base_url,
            timeout=httpx.Timeout(self._timeout, connect=10.0),
            headers={
                "Authorization": f"Bearer {self._api_key}",
            },
        )

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self._client.close()

    def __enter__(self) -> "ApiClient":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    # =========================================================================
    # Core request methods
    # =========================================================================

    def request(
        self,
        method: str,
        path: str,
        *,
        body: Any | None = None,
        query: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        timeout: float | None = None,
    ) -> Any:
        """Make an HTTP request to the API and return parsed JSON."""
        # Filter out None values from query params
        params = None
        if query:
            params = {k: v for k, v in query.items() if v is not None}

        request_headers: dict[str, str] = {}
        if headers:
            request_headers.update(headers)
        if body is not None and "Content-Type" not in request_headers:
            request_headers["Content-Type"] = "application/json"

        if self._debug:
            print(f"[ApiClient] {method} {self._base_url}{path}")

        try:
            response = self._client.request(
                method,
                path,
                json=body if body is not None else None,
                params=params,
                headers=request_headers,
                timeout=timeout or self._timeout,
            )
        except httpx.TimeoutException:
            raise ApiClientError(
                f"Request timeout after {timeout or self._timeout}s",
                408,
                "TIMEOUT",
            )
        except httpx.HTTPError as e:
            raise ApiClientError(str(e), 500, "NETWORK_ERROR")

        if not response.is_success:
            raise self._parse_error(response)

        # Handle 204 No Content
        if response.status_code == 204:
            return None

        return response.json()

    def request_stream(
        self,
        method: str,
        path: str,
        *,
        body: Any | None = None,
        timeout: float | None = None,
    ) -> Iterator[dict[str, Any]]:
        """Make a streaming SSE request and yield parsed events."""
        headers = {
            "Accept": "text/event-stream",
        }
        if body is not None:
            headers["Content-Type"] = "application/json"

        content = json.dumps(body).encode() if body is not None else None

        try:
            with self._client.stream(
                method,
                path,
                content=content,
                headers=headers,
                timeout=timeout or 600.0,  # 10 minutes for streaming
            ) as response:
                if not response.is_success:
                    # Read error body
                    response.read()
                    raise self._parse_error(response)

                yield from self._parse_sse(response.iter_lines())
        except httpx.TimeoutException:
            raise ApiClientError(
                f"Stream timeout after {timeout or 600.0}s",
                408,
                "TIMEOUT",
            )

    def request_raw(
        self,
        method: str,
        path: str,
        *,
        timeout: float | None = None,
    ) -> httpx.Response:
        """Make a raw HTTP request and return the response object."""
        try:
            response = self._client.request(
                method,
                path,
                timeout=timeout or self._timeout,
            )
        except httpx.TimeoutException:
            raise ApiClientError(
                f"Request timeout after {timeout or self._timeout}s",
                408,
                "TIMEOUT",
            )

        if not response.is_success:
            raise self._parse_error(response)

        return response

    def request_form(
        self,
        method: str,
        path: str,
        *,
        data: dict[str, Any] | None = None,
        files: dict[str, Any] | None = None,
        timeout: float | None = None,
    ) -> Any:
        """Make a multipart form request."""
        try:
            response = self._client.request(
                method,
                path,
                data=data,
                files=files,
                timeout=timeout or self._timeout,
            )
        except httpx.TimeoutException:
            raise ApiClientError(
                f"Request timeout after {timeout or self._timeout}s",
                408,
                "TIMEOUT",
            )

        if not response.is_success:
            raise self._parse_error(response)

        return response.json()

    # =========================================================================
    # Convenience methods
    # =========================================================================

    def get(
        self,
        path: str,
        query: dict[str, Any] | None = None,
    ) -> Any:
        return self.request("GET", path, query=query)

    def post(
        self,
        path: str,
        body: Any | None = None,
    ) -> Any:
        return self.request("POST", path, body=body)

    def patch(
        self,
        path: str,
        body: Any | None = None,
    ) -> Any:
        return self.request("PATCH", path, body=body)

    def put(
        self,
        path: str,
        body: Any | None = None,
    ) -> Any:
        return self.request("PUT", path, body=body)

    def delete(self, path: str) -> Any:
        return self.request("DELETE", path)

    # =========================================================================
    # Accessors
    # =========================================================================

    @property
    def base_url(self) -> str:
        return self._base_url

    @property
    def api_key(self) -> str:
        return self._api_key

    # =========================================================================
    # Internal helpers
    # =========================================================================

    @staticmethod
    def _parse_sse(lines: Iterator[str]) -> Generator[dict[str, Any], None, None]:
        """Parse SSE event stream lines into dicts."""
        for line in lines:
            if line.startswith("data: "):
                data_str = line[6:]
                if not data_str.strip():
                    continue
                try:
                    yield json.loads(data_str)
                except json.JSONDecodeError:
                    continue

    def _parse_error(self, response: httpx.Response) -> ApiClientError:
        try:
            error_data = response.json()
        except Exception:
            error_data = {
                "error": response.reason_phrase or "Unknown error",
                "message": f"HTTP {response.status_code}",
            }

        return ApiClientError(
            message=error_data.get("message") or error_data.get("error", "Unknown error"),
            status=response.status_code,
            code=error_data.get("code"),
            details=error_data.get("details"),
        )
