const { createWalletClient, http, parseUnits } = require('viem')
const { base } = require('viem/chains')
const { privateKeyToAccount } = require('viem/accounts')

const ABC_PRIVATE_KEY = process.env.ABC_PRIVATE_KEY
const ABC_ADDRESS = '0x2a4d51c77E5a724f5F90d6B8741A38564A313da1'
const BENVU_ADDRESS = '0xd6a93fB3CfaDc3c268037EA6a88DD907f0225e35'
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const FAIRCAM_URL = process.env.FAIRCAM_URL || 'https://faircam.io'

if (!ABC_PRIVATE_KEY) { console.error('Set ABC_PRIVATE_KEY env var'); process.exit(1) }

const USDC_ABI = [{ name: 'transfer', type: 'function', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' }]
const account = privateKeyToAccount(ABC_PRIVATE_KEY)
const walletClient = createWalletClient({ account, chain: base, transport: http() })

let lastPhotoId = null
let dots = 0
let hunting = true

console.log('\n🏢 ABC NEWS AI AGENT')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`💼 Wallet: ${ABC_ADDRESS}`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

function showHunting() {
  if (!hunting) return
  dots = (dots + 1) % 4
  process.stdout.write('\r🔍 AGENT HUNTING' + '.'.repeat(dots) + '   ')
}

async function checkLatestSale() {
  try {
    const r = await fetch(`${FAIRCAM_URL}/api/photos/latest-sale`)
    const d = await r.json()
    if (!d.id || !d.for_sale || d.buyer_address) return
    if (d.id === lastPhotoId) return

    lastPhotoId = d.id
    hunting = false
    process.stdout.write('\r')
    console.log(`\n🚨 NEW PHOTO FOR SALE! $${d.sale_price} USDC — ${d.id.slice(0,8)}...`)
    console.log(`⚡ Initiating purchase...`)

    const amount = parseUnits(d.sale_price.toString(), 6)
    const hash = await walletClient.writeContract({
      address: USDC_ADDRESS, abi: USDC_ABI,
      functionName: 'transfer', args: [BENVU_ADDRESS, amount]
    })
    console.log(`💸 Tx: ${hash.slice(0,20)}...`)

    const buyRes = await fetch(`${FAIRCAM_URL}/api/photos/buy/${d.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyer_address: ABC_ADDRESS, buyer_name: 'ABC News Agent', tx_hash: hash })
    })
    const buyData = await buyRes.json()
    if (buyRes.ok) {
      console.log('🏆 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🏆  ABC NEWS WINS THE PHOTO RIGHTS!')
      console.log(`🏆  $${d.sale_price} USDC | ${new Date().toLocaleTimeString()}`)
      console.log(`🔗  https://basescan.org/tx/${hash}`)
      console.log('🏆 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    } else {
      console.log(`❌ LOST RACE — ${buyData.error}`)
      console.log(`   (USDC tx still confirmed: ${hash.slice(0,20)}...)`)
    }
    hunting = true
    console.log('')
  } catch(e) {}
}

setInterval(showHunting, 400)
setInterval(checkLatestSale, 800)
