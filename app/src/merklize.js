const MerkleTree = require("merkle-tree-solidity").default
const { bufferToHex, keccak256, setLengthLeft, setLengthRight, toBuffer } = require("ethereumjs-util")
const csv = require('csvtojson')
const BigNumber = require('bignumber.js')

const decimals = BigNumber(10).pow(18)

module.exports = function(data, addressField, amountField, include) {
  const awards = data.reduce((prev, curr)=>{
    const address = curr[addressField]
    const existing = prev.find(u=>u.address===address)
    const amount = BigNumber(curr[amountField])
    if(existing) {
      existing.amount0 = existing.amount0 ? existing.amount0.plus(amount) : amount
      existing.amount1 = existing.amount1 ? existing.amount1.plus(amount) : amount
    } else {
      const award = {address, amount0: amount, amount1: amount}
      if(Array.isArray(include)) include.forEach(f=>award[f]=curr[f])
      prev.push(award)
    }
    return prev
  }, [])

  const awardHashBuffers = awards.map(r=>{
    r.amount0 = r.amount0.times(decimals)
    r.amount1 = r.amount1.times(decimals)
    const addressBuffer = toBuffer(r.address)
    const amount0Buffer = setLengthLeft(toBuffer("0x"+r.amount0.toString(16)), 32)
    const amount1Buffer = setLengthLeft(toBuffer("0x"+r.amount1.toString(16)), 32)
    const hashBuffer = keccak256(Buffer.concat([addressBuffer, amount0Buffer, amount1Buffer]))
    const hash = bufferToHex(hashBuffer)
    r.amount0 = r.amount0.toFixed()
    r.amount1 = r.amount1.toFixed()

    return hashBuffer
  })

  const merkleTree = new MerkleTree(awardHashBuffers)

  const root = bufferToHex(merkleTree.getRoot())

  awards.forEach((award,idx)=>{
    award.proof = merkleTree.getProof(awardHashBuffers[idx]).map(p=>bufferToHex(p))
    return award
  })

  console.log(`root:`, root)

  return {root, awards}
}
