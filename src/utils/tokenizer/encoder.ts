// Functional streamlining based on https://github.com/niieani/gpt-tokenizer
import bpeRanksData from './bpeRanks.js'
import {
  getCharCode,
  getCharFromCode,
  getPairs,
  range,
  splitToken,
} from './util.js'
const bpeRanks: Record<string, number> = bpeRanksData

const textEncoder = new TextEncoder()

const UPPER_BYTE_VALUE = 2 ** 8

function createByteToUnicodeMap(): Map<number, string> {
  const asciiRange = range(getCharCode('!'), getCharCode('~') + 1)
  const latin1Range1 = range(getCharCode('¡'), getCharCode('¬') + 1)
  const latin1Range2 = range(getCharCode('®'), getCharCode('ÿ') + 1)

  const initialCodePoints = [...asciiRange, ...latin1Range1, ...latin1Range2]
  const mappedCodePoints = [...initialCodePoints]

  let newCodePointOffset = 0
  for (let byteValue = 0; byteValue < UPPER_BYTE_VALUE; byteValue++) {
    if (!initialCodePoints.includes(byteValue)) {
      initialCodePoints.push(byteValue)
      mappedCodePoints.push(UPPER_BYTE_VALUE + newCodePointOffset)
      newCodePointOffset += 1
    }
  }

  const unicodeChars: any[] = mappedCodePoints.map(getCharFromCode)
  return new Map(initialCodePoints.map((x, i) => [x, unicodeChars[i]!]))
}

const pat
  = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu

const byteEncoder = createByteToUnicodeMap()

export function bpe(
  token: string,
  cache: Map<string, string> = new Map(),
): string {
  if (cache.has(token))
    return cache.get(token)!

  let word = splitToken(token)
  let pairs = getPairs(word)

  if (pairs.length === 0)
    return token

  while (true) {
    const minPairs: Map<number, [string, string]> = new Map()
    pairs.forEach((pair) => {
      const rank = bpeRanks[pair.join(',')]
      minPairs.set(

        typeof rank === 'undefined' || Number.isNaN(rank) ? 10e10 : rank,
        pair,
      )
    })
    const keys = [...minPairs.keys()]

    const bigram = minPairs.get(Math.min(...keys))

    if (!bigram || !(bigram.join(',') in bpeRanks))
      break

    const [first, second] = bigram
    let newWord: string[] = []
    let i = 0

    while (i < word.length) {
      const j = word.indexOf(first, i)
      if (j === -1) {
        newWord = newWord.concat(word.slice(i))
        break
      }
      newWord = newWord.concat(word.slice(i, j))
      i = j

      if (word[i] === first && i < word.length - 1 && word[i + 1] === second) {
        newWord.push(first + second)
        i += 2
      } else {
        newWord.push(word[i]!)
        i += 1
      }
    }

    word = newWord
    if (word.length === 1)
      break
    else
      pairs = getPairs(word)
  }

  const result = word.join(' ')
  cache.set(token, result)

  return result
}

export function *encodeGenerator(
  text: string,
  cache: Map<string, string> = new Map(),
): Generator<any[], void, undefined> {
  for (let [token] of text.matchAll(pat)) {
    token = [...textEncoder.encode(token)]
      .map(x => byteEncoder.get(x) ?? '')
      .join('')

    const newTokens = bpe(token, cache)
      .split(' ')
      .map(x => x!)

    yield newTokens
  }
}

/**
 * @returns {false | number} false if token limit is exceeded, otherwise the number of tokens
 */
export function isWithinTokenLimit(
  text: string,
  tokenLimit: number,
  cache: Map<string, string> = new Map(),
): false | number {
  const tokenGenerator = encodeGenerator(text, cache)
  let count = 0
  for (const tokens of tokenGenerator) {
    count += tokens.length
    if (count > tokenLimit)
      return false
  }
  return count
}

export function encode(
  text: string,
  cache: Map<string, string> = new Map(),
): number[] {
  return [...encodeGenerator(text, cache)].flat(1)
}

const HIGH_SURROGATE_START = 55_296
const HIGH_SURROGATE_END = 56_319
export function endsWithIncompleteUtfPairSurrogate(string: string): boolean {
  if (string.length === 0) return false
  // Check if the last character is a high surrogate
  const lastCharCode = string.charCodeAt(string.length - 1)
  return (
    lastCharCode >= HIGH_SURROGATE_START && lastCharCode <= HIGH_SURROGATE_END
  )
}

const gptEncoder = {
  encode,
  encodeGenerator,
  isWithinTokenLimit,
  bpe,
}

// used by the UMD export

export default gptEncoder
