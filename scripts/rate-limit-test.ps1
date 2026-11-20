
$ErrorActionPreference = "Stop"

# Securely read API key
$secureKey = Read-Host "Paste your ATLAS API key" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)

try {
    $apiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr).Trim()
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

$baseUrl = "http://localhost:3000/api/v1/events"
$requestCount = 150

[System.Net.ServicePointManager]::DefaultConnectionLimit = 200

$client = [System.Net.Http.HttpClient]::new()
$client.Timeout = [TimeSpan]::FromSeconds(60)

$requests = @()
$tasks = @()

try {
    Write-Host "Starting $requestCount parallel requests..."

    for ($i = 1; $i -le $requestCount; $i++) {
        $request = [System.Net.Http.HttpRequestMessage]::new(
            [System.Net.Http.HttpMethod]::Post,
            $baseUrl
        )

        $request.Headers.Authorization =
        [System.Net.Http.Headers.AuthenticationHeaderValue]::new(
            "Bearer",
            $apiKey
        )

        $request.Headers.Add(
            "Idempotency-Key",
            [guid]::NewGuid().ToString()
        )

        $body = @{
            eventName  = "RateLimitTest"
            distinctId = "rate-limit-user-$i"
            properties = @{ test = $true }
        } | ConvertTo-Json -Depth 5

        $request.Content = [System.Net.Http.StringContent]::new(
            $body,
            [System.Text.Encoding]::UTF8,
            "application/json"
        )

        $requests += $request
        $tasks += $client.SendAsync($request)
    }

    Write-Host "Waiting for responses..."

    try {
        [System.Threading.Tasks.Task]::WaitAll(
            [System.Threading.Tasks.Task[]]$tasks
        )
    }
    catch {
        Write-Host "Some requests failed. Checking individual results..."
    }

    $success = 0
    $rateLimited = 0
    $quotaExceeded = 0
    $unknown429 = 0
    $errors = 0
    $retrySeconds = 2

    foreach ($task in $tasks) {
        if ($task.IsFaulted -or $task.IsCanceled) {
            $errors++
            continue
        }

        $response = $task.Result
        $status = [int]$response.StatusCode

        try {
            if ($status -eq 202) {
                $success++
            }
            elseif ($status -eq 429) {
                $content = $response.Content.ReadAsStringAsync().
                GetAwaiter().GetResult()

                $payload = $null

                try {
                    $payload = $content | ConvertFrom-Json -ErrorAction Stop
                }
                catch {
                    $payload = $null
                }

                $errorCode = $null
                $message = ""

                if ($payload) {
                    if ($payload.error -and $payload.error.code) {
                        $errorCode = $payload.error.code
                    }
                    elseif ($payload.code) {
                        $errorCode = $payload.code
                    }

                    if ($payload.message) {
                        $message = [string]$payload.message
                    }
                    elseif ($payload.error -and $payload.error.message) {
                        $message = [string]$payload.error.message
                    }
                    elseif ($payload.error -is [string]) {
                        $message = [string]$payload.error
                    }
                }

                if ($errorCode -eq "MONTHLY_EVENT_QUOTA_EXCEEDED") {
                    $quotaExceeded++
                }
                elseif ($message -like "*Rate limit exceeded*") {
                    $rateLimited++

                    if (
                        $response.Headers.RetryAfter -and
                        $response.Headers.RetryAfter.Delta
                    ) {
                        $retrySeconds = [Math]::Max(
                            $retrySeconds,
                            [Math]::Ceiling(
                                $response.Headers.RetryAfter.Delta.TotalSeconds
                            )
                        )
                    }
                }
                else {
                    $unknown429++
                    Write-Host "Unrecognized 429 response: $content"
                }
            }
            else {
                $errors++
                Write-Host "Unexpected HTTP status: $status"

                $content = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()

                Write-Host $content
            }
        }
        finally {
            $response.Dispose()
        }
    }

    Write-Host ""
    Write-Host "========== INITIAL TEST =========="
    Write-Host "Total requests       : $requestCount"
    Write-Host "202 Successful       : $success"
    Write-Host "429 Rate limited     : $rateLimited"
    Write-Host "429 Monthly quota    : $quotaExceeded"
    Write-Host "429 Unknown          : $unknown429"
    Write-Host "Other errors         : $errors"
    Write-Host "=================================="

    if ($rateLimited -gt 0) {
        Write-Host ""
        Write-Host "Waiting $retrySeconds second(s) before retry..."

        Start-Sleep -Seconds ($retrySeconds + 1)

        $retryRequest = [System.Net.Http.HttpRequestMessage]::new(
            [System.Net.Http.HttpMethod]::Post,
            $baseUrl
        )

        $retryRequest.Headers.Authorization =
        [System.Net.Http.Headers.AuthenticationHeaderValue]::new(
            "Bearer",
            $apiKey
        )

        $retryRequest.Headers.Add(
            "Idempotency-Key",
            [guid]::NewGuid().ToString()
        )

        $retryBody = @{
            eventName  = "RateLimitRetryTest"
            distinctId = "rate-limit-retry-user"
            properties = @{
                test  = $true
                retry = $true
            }
        } | ConvertTo-Json -Depth 5

        $retryRequest.Content = [System.Net.Http.StringContent]::new(
            $retryBody,
            [System.Text.Encoding]::UTF8,
            "application/json"
        )

        try {
            $retryResponse = $client.SendAsync(
                $retryRequest
            ).GetAwaiter().GetResult()

            try {
                $retryStatus = [int]$retryResponse.StatusCode
                $retryContent = $retryResponse.Content.ReadAsStringAsync().
                GetAwaiter().GetResult()

                Write-Host ""
                Write-Host "========== RETRY TEST =========="
                Write-Host "Retry HTTP status: $retryStatus"
                Write-Host "Expected status  : 202"

                if (
                    $retryResponse.StatusCode -eq
                    [System.Net.HttpStatusCode]::Accepted
                ) {
                    Write-Host "Retry result     : SUCCESS"
                }
                else {
                    Write-Host "Retry result     : FAILED"
                    Write-Host $retryContent
                }

                Write-Host "================================"
            }
            finally {
                $retryResponse.Dispose()
            }
        }
        finally {
            $retryRequest.Dispose()
        }
    }
    else {
        Write-Host "No rate-limit 429 response received. Retry test skipped."
    }
}
finally {
    foreach ($request in $requests) {
        $request.Dispose()
    }

    $client.Dispose()
}
