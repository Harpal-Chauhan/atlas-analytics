
$ErrorActionPreference = "Stop"

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

$client = New-Object System.Net.Http.HttpClient
$client.Timeout = [TimeSpan]::FromSeconds(60)

$requests = @()
$tasks = @()

try {
    Write-Host "Starting $requestCount parallel requests..."

    for ($i = 1; $i -le $requestCount; $i++) {
        $request = New-Object System.Net.Http.HttpRequestMessage(
            [System.Net.Http.HttpMethod]::Post,
            $baseUrl
        )

        $request.Headers.Authorization =
            New-Object System.Net.Http.Headers.AuthenticationHeaderValue(
                "Bearer",
                $apiKey
            )

        $request.Headers.Add("Idempotency-Key", [guid]::NewGuid().ToString())

        $body = @{
            eventName = "RateLimitTest"
            distinctId = "rate-limit-user-$i"
            properties = @{
                test = $true
            }
        } | ConvertTo-Json -Depth 5

        $request.Content = New-Object System.Net.Http.StringContent(
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
        Write-Host "Checking individual request results..."
    }

    $success = 0
    $limited = 0
    $errors = 0
    $retrySeconds = 1

    foreach ($task in $tasks) {
        if ($task.IsFaulted -or $task.IsCanceled) {
            $errors++
            continue
        }

        $response = $task.Result
        $status = [int]$response.StatusCode

        if ($status -eq 202) {
            $success++
        }
        elseif ($status -eq 429) {
            $limited++

            if ($response.Headers.RetryAfter -and
                $response.Headers.RetryAfter.Delta) {
                $retrySeconds = [Math]::Max(
                    $retrySeconds,
                    [Math]::Ceiling(
                        $response.Headers.RetryAfter.Delta.TotalSeconds
                    )
                )
            }
        }
        else {
            $errors++
            Write-Host "Unexpected HTTP status: $status"
            Write-Host $response.Content.ReadAsStringAsync().Result
        }

        $response.Dispose()
    }

    Write-Host ""
    Write-Host "========== INITIAL TEST =========="
    Write-Host "Total requests  : $requestCount"
    Write-Host "202 Successful  : $success"
    Write-Host "429 Rate limited: $limited"
    Write-Host "Other errors    : $errors"
    Write-Host "=================================="

    if ($limited -gt 0) {
        Write-Host ""
        Write-Host "Waiting $retrySeconds second(s) before retry..."

        Start-Sleep -Seconds ($retrySeconds + 1)

        $retryRequest = New-Object System.Net.Http.HttpRequestMessage(
            [System.Net.Http.HttpMethod]::Post,
            $baseUrl
        )

        $retryRequest.Headers.Authorization =
            New-Object System.Net.Http.Headers.AuthenticationHeaderValue(
                "Bearer",
                $apiKey
            )

        $retryRequest.Headers.Add(
            "Idempotency-Key",
            [guid]::NewGuid().ToString()
        )

        $retryBody = @{
            eventName = "RateLimitRetryTest"
            distinctId = "rate-limit-retry-user"
            properties = @{
                test = $true
                retry = $true
            }
        } | ConvertTo-Json -Depth 5

        $retryRequest.Content = New-Object System.Net.Http.StringContent(
            $retryBody,
            [System.Text.Encoding]::UTF8,
            "application/json"
        )

        try {
            $retryResponse = $client.SendAsync($retryRequest).GetAwaiter().GetResult()

            Write-Host ""
            Write-Host "========== RETRY TEST =========="
            Write-Host "Retry HTTP status: $([int]$retryResponse.StatusCode)"
            Write-Host "Expected status  : 202"

            if ($retryResponse.StatusCode -eq [System.Net.HttpStatusCode]::Accepted) {
                Write-Host "Retry result     : SUCCESS"
            }
            else {
                Write-Host "Retry result     : FAILED"
                Write-Host $retryResponse.Content.ReadAsStringAsync().Result
            }

            Write-Host "================================"

            $retryResponse.Dispose()
        }
        finally {
            $retryRequest.Dispose()
        }
    }
    else {
        Write-Host "No 429 response received. Retry test skipped."
    }
}
finally {
    foreach ($request in $requests) {
        $request.Dispose()
    }

    $client.Dispose()
}
