import * as utils from '@dcl/ecs-scene-utils'
import { ReflectedRay } from './reflectedRay'
import { FloatingRock } from './floatingRock'
import { Sound } from './sound'

// Lightning orb
const lightningOrb = new Entity()
lightningOrb.addComponent(new GLTFShape('models/lightningOrb.glb'))
lightningOrb.addComponent(
  new Transform({ position: new Vector3(0, -0.5, 0.75) })
)
engine.addEntity(lightningOrb)
lightningOrb.setParent(Attachable.FIRST_PERSON_CAMERA)

// Sounds
const firstNoteSound = new Sound(new AudioClip('sounds/firstNote.mp3'), false)
const secondNoteSound = new Sound(new AudioClip('sounds/secondNote.mp3'), false)
const thirdNoteSound = new Sound(new AudioClip('sounds/thirdNote.mp3'), false)
const forthNoteSound = new Sound(new AudioClip('sounds/forthNote.mp3'), false)
const lightningOrbSound = new Sound(
  new AudioClip('sounds/lightningOrb.mp3'),
  false
)

// Base
const base = new Entity()
base.addComponent(new GLTFShape('models/baseCheckered.glb'))
engine.addEntity(base)

// Rocks
//#region
const floatingRocks: FloatingRock[] = []
const floatingWindRock = new FloatingRock(
  new GLTFShape('models/floatingWindRock.glb'),
  new GLTFShape('models/floatingWindRockGlow.glb'),
  new Transform({
    position: new Vector3(12, 2.5, 8),
    rotation: Quaternion.Euler(0, -90, 0),
  })
)
floatingRocks.push(floatingWindRock)

const floatingFireRock = new FloatingRock(
  new GLTFShape('models/floatingFireRock.glb'),
  new GLTFShape('models/floatingFireRockGlow.glb'),
  new Transform({
    position: new Vector3(8, 3, 12),
    rotation: Quaternion.Euler(0, 180, 0),
  })
)
floatingRocks.push(floatingFireRock)

const floatingWaterRock = new FloatingRock(
  new GLTFShape('models/floatingWaterRock.glb'),
  new GLTFShape('models/floatingWaterRockGlow.glb'),
  new Transform({
    position: new Vector3(4, 3.5, 8),
    rotation: Quaternion.Euler(0, 90, 0),
  })
)
floatingRocks.push(floatingWaterRock)

const floatingEarthRock = new FloatingRock(
  new GLTFShape('models/floatingEarthRock.glb'),
  new GLTFShape('models/floatingEarthRockGlow.glb'),
  new Transform({
    position: new Vector3(8, 4, 4),
    rotation: Quaternion.Euler(0, 0, 0),
  })
)
floatingRocks.push(floatingEarthRock)
//#endregion

// Ray
const rayShape = new GLTFShape('models/ray.glb')
const ray = new Entity()
ray.addComponent(rayShape)
ray.addComponent(
  new Transform({ position: new Vector3(8, 1.25, 8), scale: Vector3.Zero() })
)
engine.addEntity(ray)

// Reflect
const reflectedRays: ReflectedRay[] = []
const rayDelayEntity = new Entity()
engine.addEntity(rayDelayEntity)
let reflectCount = 0

// Input
const input = Input.instance
let physicsCast = PhysicsCast.instance
let forwardVector: Vector3 = Vector3.Forward().rotate(Camera.instance.rotation)

// Left mouse button
input.subscribe('BUTTON_DOWN', ActionButton.POINTER, true, (e) => {
  lightningOrbSound.getComponent(AudioSource).playOnce()

  // Switch off all rock glows
  for (let rock of floatingRocks) {
    rock.toggleGlow(false)
  }

  if (e.hit.meshName == 'mirror_collider') {
    // Delete previous reflected rays and temp entities
    while (reflectedRays.length > 0) {
      let reflectedRay = reflectedRays.pop()
      engine.removeEntity(reflectedRay)
    }
    reflectCount = 0
    let floatingRock = engine.entities[e.hit.entityId] as FloatingRock
    floatingRock.toggleGlow(true) // Turn on glow for the rock that's hit
    forwardVector = Vector3.Forward().rotate(Camera.instance.rotation) // Update forward vector
    let reflectedVector: Vector3 = reflectVector(forwardVector, e.hit.normal)

    // NEEDS REFACTORING
    let forwardVec = Vector3.Forward().scale(1).rotate(Camera.instance.rotation)
    let startPosition = Camera.instance.position.clone().add(forwardVec)
    let distanceFromCamera = Vector3.Distance(startPosition, e.hit.hitPoint)

    // Ray
    ray.getComponent(Transform).position = startPosition
    ray.getComponent(Transform).position.y -= 0.5 // Offset ray
    ray.getComponent(Transform).lookAt(e.hit.hitPoint)
    let startSize = ray.getComponent(Transform).scale.setAll(1)

    // Scale the ray to size
    let endSize = new Vector3(startSize.x, startSize.y, distanceFromCamera)
    ray.addComponentOrReplace(
      new utils.ScaleTransformComponent(startSize, endSize, 0.1, () => {
        reflectRay(e.hit.hitPoint, reflectedVector)
      })
    )

    // Ray dissipates after half a second
    rayDelayEntity.addComponentOrReplace(
      new utils.Delay(500, () => {
        ray.addComponentOrReplace(
          new utils.ScaleTransformComponent(
            endSize,
            new Vector3(0, 0, endSize.z),
            0.2
          )
        )
      })
    )
  } else {
    // NEEDS REFACTORING
    let forwardVec = Vector3.Forward().scale(1).rotate(Camera.instance.rotation)
    let startPosition = Camera.instance.position.clone().add(forwardVec)
    ray.getComponent(Transform).position = startPosition
    ray.getComponent(Transform).position.y -= 0.5 // Offset ray
    forwardVector = Vector3.Forward().scale(5).rotate(Camera.instance.rotation) // Update forward vector
    let newPos: Vector3 = Camera.instance.position.clone().add(forwardVector)
    ray.getComponent(Transform).lookAt(newPos)
    let startSize = ray.getComponent(Transform).scale.setAll(1)

    // Scale the ray to size
    let endSize = new Vector3(startSize.x, startSize.y, 4)
    ray.addComponentOrReplace(
      new utils.ScaleTransformComponent(startSize, endSize, 0.1)
    )
    // Ray dissipates after half a second
    rayDelayEntity.addComponentOrReplace(
      new utils.Delay(500, () => {
        ray.addComponentOrReplace(
          new utils.ScaleTransformComponent(
            endSize,
            new Vector3(0, 0, endSize.z),
            0.2
          )
        )
      })
    )
  }
})

// Recursive function for reflecting a ray every time it hits a mirror
function reflectRay(hitPoint: Vector3, reflectedVector: Vector3) {
  // Reflect entity to run expire function
  const reflectExpireEntity = new Entity()
  engine.addEntity(reflectExpireEntity)

  // Reflected ray
  const reflectedRay = new ReflectedRay(rayShape, hitPoint, reflectedVector)
  reflectedRay.getComponent(Transform).position = hitPoint
  let reflectedTarget = hitPoint.clone().add(reflectedVector)
  reflectedRay.getComponent(Transform).lookAt(reflectedTarget)
  reflectedRays.push(reflectedRay)

  // Update reflect count
  reflectCount++
  playNote(reflectCount)

  physicsCast.hitFirst(reflectedRay.ray, (e) => {
    let distance = Vector3.Distance(reflectedRay.ray.origin, e.hitPoint)
    let startSize = reflectedRay.getComponent(Transform).scale

    // Scale reflected ray to size
    let endSize = new Vector3(startSize.x, startSize.y, distance)
    let timeToTravel = distance * 0.05
    reflectedRay.addComponentOrReplace(
      new utils.ScaleTransformComponent(
        startSize,
        endSize,
        timeToTravel,
        () => {
          if (e.entity.meshName == 'mirror_collider') {
            let roundMirror = engine.entities[e.entity.entityId] as FloatingRock
            roundMirror.toggleGlow(true) // Turn on glow for mirror
            let reflectedVector: Vector3 = reflectVector(
              new Vector3(
                reflectedRay.ray.direction.x,
                reflectedRay.ray.direction.y,
                reflectedRay.ray.direction.z
              ),
              new Vector3(e.hitNormal.x, e.hitNormal.y, e.hitNormal.z)
            )
            reflectRay(
              new Vector3(e.hitPoint.x, e.hitPoint.y, e.hitPoint.z),
              reflectedVector
            )
          }
        }
      )
    )
    // Reflected ray dissipates after a period proportional to the travelled distance
    reflectExpireEntity.addComponentOrReplace(
      new utils.ExpireIn(1000 * timeToTravel, () => {
        reflectedRay.addComponentOrReplace(
          new utils.ScaleTransformComponent(
            endSize,
            new Vector3(0, 0, endSize.z),
            0.5
          )
        )
      })
    )
  })
}

// Put in the direction of the previous ray and the normal of the raycast's hitpoint
function reflectVector(incident: Vector3, normal: Vector3): Vector3 {
  let dot = 2 * Vector3.Dot(incident, normal)
  let reflected = incident.subtract(normal.multiplyByFloats(dot, dot, dot))
  return reflected
}

function playNote(reflectCount: number): void {
  // TODO: There's a delay when playing the notes
  switch (reflectCount) {
    case 1:
      firstNoteSound.getComponent(AudioSource).playOnce()
      break
    case 2:
      secondNoteSound.getComponent(AudioSource).playOnce()
      break
    case 3:
      thirdNoteSound.getComponent(AudioSource).playOnce()
      break
    case 4:
      forthNoteSound.getComponent(AudioSource).playOnce()
      log('You Win!')
      break
    default:
      break
  }
}
