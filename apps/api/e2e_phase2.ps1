$base = 'http://localhost:3000/api'
$ts = [DateTime]::UtcNow.ToString('HHmmssfff')
$login = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -Body (@{email='admin@demo.com';password='admin123'} | ConvertTo-Json) -ContentType 'application/json'
$h = @{ Authorization = "Bearer $($login.accessToken)" }
$out = @()
function POST($u,$b){ if($b){ Invoke-RestMethod -Uri $u -Method Post -Headers $h -Body ($b|ConvertTo-Json -Depth 6) -ContentType 'application/json' } else { Invoke-RestMethod -Uri $u -Method Post -Headers $h -ContentType 'application/json' -Body '{}' } }
function GET($u){ Invoke-RestMethod -Uri $u -Headers $h }

# 1. NOTIFICATIONS low-stock
$prod = POST "$base/inventory/products" @{sku="P2-$ts";name='P2';category='Gen';unit='pcs';taxCode='GST';costPrice=5;salePrice=10;reorderLevel=8}
$wh = (GET "$base/inventory/warehouses")[0].id
POST "$base/inventory/stock/adjust" @{productId=$prod.id;warehouseId=$wh;quantity=5;reason='init'} | Out-Null
POST "$base/inventory/stock/adjust" @{productId=$prod.id;warehouseId=$wh;quantity=-3;reason='damage'} | Out-Null
$notifs = GET "$base/notifications"
$lowAlert = $notifs | Where-Object { $_.type -eq 'LOW_STOCK' }
$out += "NOTIFY: totalNotifs=$($notifs.Count) lowStockFired=$(if($lowAlert){'YES'}else{'NO'}) unread=$(GET "$base/notifications/unread-count")"

# 2. INVENTORY advanced
$batch = POST "$base/inventory/batches" @{productId=$prod.id;warehouseId=$wh;batchNo="B$ts";quantity=5;costPrice=6;expiryDate='2026-12-31'}
$batches = GET "$base/inventory/batches?productId=$($prod.id)"
$valuation = GET "$base/inventory/valuation?method=WEIGHTED_AVG"
$valItem = $valuation | Where-Object { $_.productId -eq $prod.id }
$expiring = GET "$base/inventory/batches/expiring?withinDays=200"
$out += "BATCH: count=$($batches.Count) VALUATION unitCost=$($valItem.unitCost) total=$($valItem.totalValue) expiringBatches=$($expiring.Count)"
$st = POST "$base/inventory/stock-takes" @{lines=@(@{productId=$prod.id;warehouseId=$wh;countedQty=2})}
$stDone = POST "$base/inventory/stock-takes/$($st.id)/complete" $null
$out += "STOCKTAKE: created=$($st.reference) completedStatus=$($stDone.status)"

# 3. TAX summary
$tax = GET "$base/tax/summary"
$out += "TAX_SUMMARY: output=$($tax.outputTax) input=$($tax.inputTax) net=$($tax.netTax) reconciled=$($tax.reconciled)"

# 4. BANK
$acc = POST "$base/accounting/bank/accounts" @{name="Op Bank";bankName='XYZ';currency='USD'}
$dep = POST "$base/accounting/bank/deposit" @{bankAccountId=$acc.id;amount=200;description='Deposit'}
$wd = POST "$base/accounting/bank/withdraw" @{bankAccountId=$acc.id;amount=50;description='Withdraw'}
$txns = GET "$base/accounting/bank/transactions?bankAccountId=$($acc.id)"
$aging = GET "$base/accounting/bank/aging"
$out += "BANK: accounts=$((GET "$base/accounting/bank/accounts").Count) txns=$($txns.Count) depAmt=$($dep.amount) wdAmt=$($wd.amount) agingAR=$($aging.ar.Count)"

# 5. EXPENSE
$exp = POST "$base/accounting/expense" @{category='Rent';description='Office rent';amount=120;paymentMode='BANK'}
$expList = GET "$base/accounting/expense"
$out += "EXPENSE: created=$($exp.id) amount=$($exp.amount) listCount=$($expList.Count)"

# 6. RECURRING
$cust = POST "$base/sales/customers" @{name="RecCust$ts";taxId="RC$ts"}
POST "$base/inventory/stock/adjust" @{productId=$prod.id;warehouseId=$wh;quantity=10;reason='seed'} | Out-Null
$tpl = POST "$base/sales/recurring/templates" @{customerId=$cust.id;name="Monthly$ts";frequency='MONTHLY';interval=1;nextRunDate='2026-07-17';items=@(@{productId=$prod.id;quantity=2;rate=10;taxRate=0})}
$tpls = GET "$base/sales/recurring/templates"
$gen = POST "$base/sales/recurring/templates/$($tpl.id)/generate" $null
$out += "RECURRING: templates=$($tpls.Count) generatedInv=$($gen.number) status=$($tpl.status) nextRun=$($tpl.nextRunDate)"

# 7. REPORTS
$invR = GET "$base/reports/inventory"
$salesR = GET "$base/reports/sales"
$out += "REPORTS: inventoryItems=$($invR.items.Count) invValue=$($invR.totalInventoryValue) salesCount=$($salesR.count) salesTotal=$($salesR.totalSales)"

# 8. RBAC unauth
try { Invoke-RestMethod -Uri "$base/accounting/bank/accounts" -TimeoutSec 5 | Out-Null; $rbac='FAIL(no 401)' } catch { $rbac = "OK401=$(if($_.Exception.Response.StatusCode.value__ -eq 401){'yes'}else{'no'})" }
$out += "RBAC: $rbac"

$out | ForEach-Object { Write-Host $_ }
$out | Out-File -FilePath e2e_phase2_result.txt -Encoding utf8
