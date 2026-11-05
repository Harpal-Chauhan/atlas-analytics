
$ErrorActionPreference = "Stop"

# Load test configuration
$baseUrl = "http://localhost:3000/api/v1/events"
$totalEvents = 20000
$batchSize = 500
$intervalSeconds = 2.5
$targetEventsPerSecond = 200

# Read API key securely
$secureKey = Read-Host "Enter your ATLAS API key" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)

try {
    $apiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if ($apiKey -notmatch '^atlas_[a-f0-9]{64}$') {
    throw "Invalid API key format."
}

# Create HTTP client
$client = [System.Net.Http.HttpClient]::new()
$client.Timeout = [TimeSpan]::FromMinutes(5)

# Unique ID for this test run
$runId = [guid]::NewGuid().ToString()

$eventNames = @(
    "Page Viewed",
    "Product Viewed",
    "Add to Cart",
    "Checkout Started",
    "Purchase Completed"
)

$batches = @()
$batchCount = [math]::Ceiling($totalEvents / $batchSize)

Write-Host "`nPreparing $totalEvents events..." -ForegroundColor Cyan

# Prepare event batches
for ($batchIndex = 0; $batchIndex -lt $batchCount; $batchIndex++) {
    $events = @()

    for ($j = 0; $j -lt $batchSize; $j++) {
        $sequence = ($batchIndex * $batchSize) + $j

        if ($sequence -ge $totalEvents) {
            break
        }

        $events += [pscustomobject]@{
            eventName = $eventNames[$sequence % $eventNames.Count]
            distinctId = "load-test-user-$sequence"
            properties = @{
                loadTestRun = $runId
                sequence = $sequence
            }
        }
    }

    $jsonBody = @{
        events = $events
    } | ConvertTo-Json -Depth 10 -Compress

    $batches += [pscustomobject]@{
        Json = $jsonBody
        IdempotencyKey = "load-test-$runId-$batchIndex"
    }
}

# Create an HTTP request
$createRequest = {
    param($jsonBody, $idempotencyKey)

    $request = [System.Net.Http.HttpRequestMessage]::new(
        [System.Net.Http.HttpMethod]::Post,
        $baseUrl
    )

    $request.Headers.Authorization =
        [System.Net.Http.Headers.AuthenticationHeaderValue]::new(
            "Bearer",
            $apiKey
        )

    $null = $request.Headers.TryAddWithoutValidation(
        "Idempotency-Key",
        $idempotencyKey
    )

    $request.Content = [System.Net.Http.StringContent]::new(
        $jsonBody,
        [System.Text.Encoding]::UTF8,
        "application/json"
    )

    return $request
}

# Result counters
$acceptedEvents = 0
$failedRequests = 0
$duplicateRequests = 0
$zeroAcceptedRequests = 0
$failureMessages = @()

Write-Host "`nStarting controlled load test..." -ForegroundColor Cyan
Write-Host "Total events: $totalEvents"
Write-Host "Batch size: $batchSize"
Write-Host "Request interval: $intervalSeconds seconds"
Write-Host "Target throughput: $targetEventsPerSecond events/second"
Write-Host ""

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

try {
    for ($i = 0; $i -lt $batches.Count; $i++) {

        # Schedule each request 2.5 seconds apart
        $targetStart = $i * $intervalSeconds
        $remaining = $targetStart - $stopwatch.Elapsed.TotalSeconds

        if ($remaining -gt 0) {
            Start-Sleep -Milliseconds (
                [int][math]::Round($remaining * 1000)
            )
        }

        $batch = $batches[$i]

        $request = & $createRequest `
            $batch.Json `
            $batch.IdempotencyKey

        $response = $null

        try {
            $response = $client.SendAsync(
                $request
            ).GetAwaiter().GetResult()

            $statusCode = [int]$response.StatusCode

            $responseBody = $response.Content.ReadAsStringAsync().
                GetAwaiter().GetResult()

            # Retry rate-limited requests
            $attempt = 0

            while ($statusCode -eq 429 -and $attempt -lt 10) {
                $waitSeconds = 1

                if (
                    $response.Headers.RetryAfter -and
                    $response.Headers.RetryAfter.Delta
                ) {
                    $waitSeconds = [math]::Max(
                        1,
                        [math]::Ceiling(
                            $response.Headers.RetryAfter.Delta.TotalSeconds
                        )
                    )
                }

                $response.Dispose()
                $response = $null

                $request.Dispose()

                Write-Host "Rate limited. Waiting $waitSeconds seconds..." `
                    -ForegroundColor Yellow

                Start-Sleep -Seconds $waitSeconds

                $request = & $createRequest `
                    $batch.Json `
                    $batch.IdempotencyKey

                $response = $client.SendAsync(
                    $request
                ).GetAwaiter().GetResult()

                $statusCode = [int]$response.StatusCode

                $responseBody = $response.Content.ReadAsStringAsync().
                    GetAwaiter().GetResult()

                $attempt++
            }

            if ($statusCode -eq 202) {
                $result = $responseBody | ConvertFrom-Json

                $acceptedEvents += [int]$result.accepted

                if ($result.duplicate -eq $true) {
                    $duplicateRequests++
                }

                if ([int]$result.accepted -eq 0) {
                    $zeroAcceptedRequests++
                }
            }
            else {
                $failedRequests++

                $failureMessages += (
                    "HTTP $statusCode : $responseBody"
                )
            }
        }
        catch {
            $failedRequests++
            $failureMessages += $_.Exception.Message
        }
        finally {
            if ($response) {
                $response.Dispose()
            }

            if ($request) {
                $request.Dispose()
            }
        }

        if (($i + 1) % 4 -eq 0) {
            Write-Host (
                "Completed {0}/{1} batches | Accepted: {2}" -f
                ($i + 1),
                $batches.Count,
                $acceptedEvents
            )
        }
    }
}
finally {
    $stopwatch.Stop()
    $client.Dispose()
}

# Calculate throughput
$elapsedSeconds = $stopwatch.Elapsed.TotalSeconds
$throughput = 0

if ($elapsedSeconds -gt 0) {
    $throughput = [math]::Round(
        $acceptedEvents / $elapsedSeconds,
        2
    )
}

# Display results
Write-Host "`n========== LOAD TEST RESULT ==========" -ForegroundColor Cyan

Write-Host "Total requested events : $totalEvents"
Write-Host "Accepted events        : $acceptedEvents"
Write-Host "Failed requests        : $failedRequests"
Write-Host "Duplicate requests     : $duplicateRequests"
Write-Host "Zero accepted requests : $zeroAcceptedRequests"
Write-Host "Time taken             : $([math]::Round($elapsedSeconds, 2)) seconds"
Write-Host "Events per second      : $throughput"

if (
    $acceptedEvents -eq $totalEvents -and
    $failedRequests -eq 0 -and
    $throughput -ge $targetEventsPerSecond
) {
    Write-Host "`nPASS: Target of 200 events/second achieved!" `
        -ForegroundColor Green
}
else {
    Write-Host "`nNOT PASSED: Target was not fully achieved." `
        -ForegroundColor Red
}

if ($failureMessages.Count -gt 0) {
    Write-Host "`nErrors:" -ForegroundColor Red

    $failureMessages | ForEach-Object {
        Write-Host $_
    }
}
