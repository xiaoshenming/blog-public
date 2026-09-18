'use client'

// src/app/music/visualizer/cadenza/collisionIndex.ts
// Spatial index behind the placement solver: band-bucketed occupied rects plus stamp-deduplicated
// overlap queries. This is the occupied-rect bookkeeping that upstream kept as closures inside
// buildWordPlacements, lifted out unchanged so the solver file stays focused on placement policy.

export interface OccupiedRect {
	left: number
	top: number
	right: number
	bottom: number
}

export interface CollisionProbe {
	intersects: boolean
	overlapArea: number
}

export interface OccupiedRectIndex {
	register: (rect: OccupiedRect) => void
	evaluate: (left: number, top: number, right: number, bottom: number) => CollisionProbe
}

export const createOccupiedRectIndex = (collisionBandSize: number): OccupiedRectIndex => {
	const occupiedRects: OccupiedRect[] = []
	const occupiedBands = new Map<number, number[]>()
	const occupiedMarks: number[] = []
	let occupiedQueryStamp = 0

	const getBandIndex = (value: number) => Math.floor(value / collisionBandSize)

	const register = (rect: OccupiedRect) => {
		const rectIndex = occupiedRects.length
		occupiedRects.push(rect)

		const startBand = getBandIndex(rect.top)
		const endBand = getBandIndex(rect.bottom)
		for (let band = startBand; band <= endBand; band++) {
			const bucket = occupiedBands.get(band)
			if (bucket) {
				bucket.push(rectIndex)
			} else {
				occupiedBands.set(band, [rectIndex])
			}
		}
	}

	const evaluate = (left: number, top: number, right: number, bottom: number): CollisionProbe => {
		if (occupiedRects.length === 0) {
			return {
				intersects: false,
				overlapArea: 0
			}
		}

		occupiedQueryStamp += 1
		const stamp = occupiedQueryStamp
		const startBand = getBandIndex(top)
		const endBand = getBandIndex(bottom)
		let intersects = false
		let overlapArea = 0

		for (let band = startBand; band <= endBand; band++) {
			const bucket = occupiedBands.get(band)
			if (!bucket) continue

			for (let bucketIndex = 0; bucketIndex < bucket.length; bucketIndex++) {
				const rectIndex = bucket[bucketIndex]!
				if (occupiedMarks[rectIndex] === stamp) {
					continue
				}
				occupiedMarks[rectIndex] = stamp

				const rect = occupiedRects[rectIndex]!
				const overlapWidth = Math.max(0, Math.min(right, rect.right) - Math.max(left, rect.left))
				const overlapHeight = Math.max(0, Math.min(bottom, rect.bottom) - Math.max(top, rect.top))
				if (overlapWidth <= 0 || overlapHeight <= 0) {
					continue
				}

				intersects = true
				overlapArea += overlapWidth * overlapHeight
			}
		}

		return {
			intersects,
			overlapArea
		}
	}

	return { register, evaluate }
}
