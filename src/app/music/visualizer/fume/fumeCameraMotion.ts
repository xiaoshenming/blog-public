import type { CameraRetargetState, CameraTarget, CameraViewTarget, ViewportSize } from './fumeTypes'
import { CAMERA_SCALE_MAX, CAMERA_SCALE_MIN, resolveOverviewFlightBridge } from './fumeCamera'
import type { FumeCameraFramePlan } from './fumeFrameCamera'
import { clamp, easeInOutCubic, easeOutCubic, mix, quadraticBezier } from './fumeUtils'

// src/app/music/visualizer/fume/fumeCameraMotion.ts
// Second half of the per-frame camera pipeline: how the camera actually travels toward the plan.
// Fresh retargets may open a bridge - a direct cross-fade or the lofted overview waypoint for
// multi-screen jumps - otherwise the position and zoom follow their damped spring toward the
// focus. Mutates the camera/retarget refs exactly like the upstream closure did and returns the
// screen scale the rest of the frame draws with.

export interface FumeCameraMotionContext {
	plan: FumeCameraFramePlan
	dt: number
	viewport: ViewportSize
	overviewCamera: CameraViewTarget | null
	cameraSpeed: number
	cameraRef: { current: CameraTarget }
	retargetRef: { current: CameraRetargetState }
}

export const integrateFumeCameraMotion = ({ plan, dt, viewport, overviewCamera, cameraSpeed, cameraRef, retargetRef }: FumeCameraMotionContext): number => {
	const targetCameraX = plan.targetX
	const targetCameraY = plan.targetY
	const targetCameraScale = plan.targetScale
	const retargetPhase = plan.retargetPhase
	const retargetBoost = plan.retargetBoost

	if (plan.didRetargetThisFrame) {
		const bridgeScale = Math.max(cameraRef.current.scale, targetCameraScale, 0.001)
		const screenDeltaX = Math.abs(targetCameraX - retargetRef.current.fromX) * bridgeScale
		const screenDeltaY = Math.abs(targetCameraY - retargetRef.current.fromY) * bridgeScale
		const screenDistance = Math.hypot(screenDeltaX, screenDeltaY)
		retargetRef.current.bridgeMode = screenDistance >= Math.min(viewport.width, viewport.height) * 0.42 ? 'direct' : 'none'
		retargetRef.current.bridgeWaypointX = targetCameraX
		retargetRef.current.bridgeWaypointY = targetCameraY
		retargetRef.current.bridgeWaypointScale = targetCameraScale
		retargetRef.current.bridgeWaypointPhase = 0.5

		if (retargetRef.current.sourceLineIndex >= 0) {
			const overviewFlightBridge = resolveOverviewFlightBridge({
				fromX: retargetRef.current.fromX,
				fromY: retargetRef.current.fromY,
				fromScale: retargetRef.current.fromScale,
				targetX: targetCameraX,
				targetY: targetCameraY,
				targetScale: targetCameraScale,
				overviewCamera,
				viewport
			})

			if (overviewFlightBridge) {
				retargetRef.current.bridgeMode = 'overview'
				retargetRef.current.bridgeWaypointX = overviewFlightBridge.waypointX
				retargetRef.current.bridgeWaypointY = overviewFlightBridge.waypointY
				retargetRef.current.bridgeWaypointScale = overviewFlightBridge.waypointScale
				retargetRef.current.bridgeWaypointPhase = overviewFlightBridge.waypointPhase
				retargetRef.current.duration = Math.max(retargetRef.current.duration, clamp(overviewFlightBridge.duration / cameraSpeed, 0.16, 0.9))
			}
		}
	}

	const cameraDistance = Math.hypot(targetCameraX - cameraRef.current.x, targetCameraY - cameraRef.current.y)
	const shouldUseBridge = retargetRef.current.bridgeMode !== 'none' && retargetPhase < 1

	if (shouldUseBridge) {
		let bridgedCameraX = targetCameraX
		let bridgedCameraY = targetCameraY
		let bridgedCameraScale = targetCameraScale

		if (retargetRef.current.bridgeMode === 'overview') {
			const bridgePhase = easeOutCubic(retargetPhase)
			bridgedCameraX = quadraticBezier(retargetRef.current.fromX, retargetRef.current.bridgeWaypointX, targetCameraX, bridgePhase)
			bridgedCameraY = quadraticBezier(retargetRef.current.fromY, retargetRef.current.bridgeWaypointY, targetCameraY, bridgePhase)
			bridgedCameraScale = quadraticBezier(retargetRef.current.fromScale, retargetRef.current.bridgeWaypointScale, targetCameraScale, bridgePhase)
		} else {
			const bridgePhase = easeInOutCubic(retargetPhase)
			bridgedCameraX = mix(retargetRef.current.fromX, targetCameraX, bridgePhase)
			bridgedCameraY = mix(retargetRef.current.fromY, targetCameraY, bridgePhase)
			bridgedCameraScale = mix(retargetRef.current.fromScale, targetCameraScale, bridgePhase)
		}

		const bridgeCatchUp =
			1 - Math.exp(-dt * (retargetRef.current.bridgeMode === 'overview' ? mix(12.5, 22, 1 - retargetPhase) : mix(10.5, 17.5, 1 - retargetPhase)))

		cameraRef.current.focusX = bridgedCameraX
		cameraRef.current.focusY = bridgedCameraY
		cameraRef.current.focusScale = bridgedCameraScale
		cameraRef.current.x += (bridgedCameraX - cameraRef.current.x) * bridgeCatchUp
		cameraRef.current.y += (bridgedCameraY - cameraRef.current.y) * bridgeCatchUp
		cameraRef.current.scale += (bridgedCameraScale - cameraRef.current.scale) * bridgeCatchUp
		cameraRef.current.scale = clamp(cameraRef.current.scale, CAMERA_SCALE_MIN, CAMERA_SCALE_MAX)
		cameraRef.current.velocityX *= 0.72
		cameraRef.current.velocityY *= 0.72
		cameraRef.current.velocityScale *= 0.68
	} else {
		const boostedCatchUpRate = clamp(4.8 / Math.max(retargetRef.current.duration, 0.05), 20, 54)
		const targetCatchUp = 1 - Math.exp(-dt * mix(11.2, boostedCatchUpRate, retargetBoost))
		cameraRef.current.focusX += (targetCameraX - cameraRef.current.focusX) * targetCatchUp
		cameraRef.current.focusY += (targetCameraY - cameraRef.current.focusY) * targetCatchUp
		cameraRef.current.focusScale += (targetCameraScale - cameraRef.current.focusScale) * (1 - Math.exp(-dt * mix(5.4, 12.8, retargetBoost)))

		const springStrength = mix(208, clamp(15.8 / Math.max(retargetRef.current.duration * retargetRef.current.duration, 0.0064), 260, 780), retargetBoost)
		const damping = mix(24, clamp(Math.sqrt(springStrength) * 1.36, 24, 40), retargetBoost)
		const accelX = (cameraRef.current.focusX - cameraRef.current.x) * springStrength - cameraRef.current.velocityX * damping
		const accelY = (cameraRef.current.focusY - cameraRef.current.y) * springStrength - cameraRef.current.velocityY * damping
		cameraRef.current.velocityX += accelX * dt
		cameraRef.current.velocityY += accelY * dt
		const maxVelocity = mix(1320, clamp(cameraDistance / Math.max(retargetRef.current.duration * 0.28, 0.028), 2600, 8800), retargetBoost)
		cameraRef.current.velocityX = clamp(cameraRef.current.velocityX, -maxVelocity, maxVelocity)
		cameraRef.current.velocityY = clamp(cameraRef.current.velocityY, -maxVelocity, maxVelocity)
		cameraRef.current.x += cameraRef.current.velocityX * dt
		cameraRef.current.y += cameraRef.current.velocityY * dt

		const scaleSpringStrength = mix(54, 108, retargetBoost)
		const scaleDamping = mix(13.5, 21, retargetBoost)
		const accelScale = (cameraRef.current.focusScale - cameraRef.current.scale) * scaleSpringStrength - cameraRef.current.velocityScale * scaleDamping
		cameraRef.current.velocityScale += accelScale * dt
		cameraRef.current.velocityScale = clamp(cameraRef.current.velocityScale, -1.6, 1.6)
		cameraRef.current.scale += cameraRef.current.velocityScale * dt
		cameraRef.current.scale = clamp(cameraRef.current.scale, CAMERA_SCALE_MIN, CAMERA_SCALE_MAX)
	}

	return cameraRef.current.scale
}
