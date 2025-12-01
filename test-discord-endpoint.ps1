# Test Discord Interactions Endpoint
# Run this to verify your function is deployed and responding

$url = "https://hirifbecooazbevauffq.supabase.co/functions/v1/discord-interactions"
$body = @{ type = 1 } | ConvertTo-Json

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Discord Interactions Endpoint" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URL: $url" -ForegroundColor Yellow
Write-Host "Testing with PING (type 1)..." -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    Write-Host "✅ SUCCESS! Function is deployed and responding!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10)
    Write-Host ""
    Write-Host "✅ Your function is ready for Discord verification!" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Function may not be deployed yet" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error Details:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host ""
        Write-Host "HTTP Status: $statusCode" -ForegroundColor Yellow
        
        if ($statusCode -eq 404) {
            Write-Host ""
            Write-Host "⚠️  Function not found (404)" -ForegroundColor Yellow
            Write-Host "   → The function needs to be deployed first!" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "To deploy:" -ForegroundColor Cyan
            Write-Host "   supabase functions deploy discord-interactions" -ForegroundColor White
        } elseif ($statusCode -eq 401) {
            Write-Host ""
            Write-Host "⚠️  Unauthorized (401)" -ForegroundColor Yellow
            Write-Host "   → Function is deployed but signature verification failed" -ForegroundColor Yellow
            Write-Host "   → This is OK for manual testing - Discord will send proper signatures" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Deploy the function: supabase functions deploy discord-interactions" -ForegroundColor White
    Write-Host "2. Set environment variables in Supabase Dashboard" -ForegroundColor White
    Write-Host "3. Try setting the Discord endpoint URL again" -ForegroundColor White
}

