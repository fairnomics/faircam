import { createWalletClient, http, parseUnits } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const REUTERS_PRIVATE_KEY = process.env.REUTERS_PRIVATE_KEY
const REUTERS_ADDRESS = '0xa7100E31b72e6Ac68baB26b621C0aEC47146e49F'
const BENVU_ADDRESS = '0xd6a93fB3CfaDc3c268037EA6a88DD907f0225e35'
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const FAIRCAM_URL = process.env.FAIRCAM_URL || 'https://faircam.io'
const PHOTO_ID = process.argv[2]

if (!PHOTO_ID) { console.error('Usage: REUTERS_PRIVATE_KEY=0x... node --input-type=module reuters-agent.mjs <photo-id>'); process.exit(1) }
if (!REUTERS_PRIVATE_KEY) { console.error('Set REUTERS_PRIVATE_KEY env var'); process.exit(1) }

const USDC_ABI = [{ name: 'transfer', type: 'function', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' }]

async function run() {
  console.log('\n📡 REUTERS AI AGENT — PHOTO RIGHTS ACQUISITION')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📸 Targeting FairPhoto: ${PHOTO_ID.slice(0,8)}...`)
  console.log(`💼 Agent Wallet: ${REUTERS_ADDRESS}`)
  console.log(`👤 Photographer: ${BENVU_ADDRESS}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('⏳ Monitoring FairCam for photo to go on sale...\n')

  const account = privateKeyToAccount(REUTERS_PRIVATE_KEY)
  const walletClient = createWalletClient({ account, chain: base, transport: http() })

  let saleData = null
  while (!saleData) {
    try {
      const r = await fetch(`${FAIRCAM_URL}/api/photos/sale/${PHOTO_ID}`)
      const d = await r.json()
      if (d.for_sale && !d.buyer_address) {
        saleData = d
        console.log(`\n🚨 PHOTO IS FOR SALE! Price: ${d.sale_price} USDC`)
        console.log(`⚡ Reuters Agent initiating purchase...\n`)
      } else if (d.buyer_address) {
        console.log(`\n❌ Already sold to: ${d.buyer_name || d.buyer_address}`)
        process.exit(0)
      } else { process.stdout.write('.') }
    } catch(e) { process.stdout.write('x') }
    if (!saleData) await new Promise(r => setTimeout(r, 1000))
  }

  try {
    const amount = parseUnits(saleData.sale_price.toString(), 6)
    console.log(`💸 Sending ${saleData.sale_price} USDC on Base...`)
    const hash = await walletClient.writeContract({
      address: USDC_ADDRESS, abi: USDC_ABI,
      functionName: 'transfer', args: [BENVU_ADDRESS, amount]
    })
    console.log(`✅ Transaction submitted!`)
    console.log(`🔗 https://basescan.org/tx/${hash}\n`)
    const buyRes = await fetch(`${FAIRCAM_URL}/api/photos/buy/${PHOTO_ID}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyer_address: REUTERS_ADDRESS, buyer_name: 'Reuters Agent', tx_hash: hash })
    })
    const buyData = await buyRes.json()
    if (buyRes.ok) {
      console.log('🏆 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🏆  REUTERS WINS THE PHOTO RIGHTS!')
      console.log(`🏆  Price paid: ${saleData.sale_price} USDC`)
      console.log(`🏆  Tx: ${hash}`)
      console.log('🏆 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    } else {
      console.log(`⚠️  USDC sent but rights won by: ${buyData.winner || 'another agent'}`)
    }
  } catch(e) { console.error('❌ Error:', e.message) }
}
run()
