import * as utils from '@dcl/ecs-scene-utils'
export class FloatingRock extends Entity {
  public floatingRockGlow = new Entity()

  constructor(
    floatingRock: GLTFShape,
    floatingRockGlow: GLTFShape,
    transform: Transform
  ) {
    super()
    engine.addEntity(this)
    this.addComponent(floatingRock)
    this.addComponent(transform)

    this.floatingRockGlow.addComponent(floatingRockGlow)
    this.floatingRockGlow.addComponent(new Transform())
    this.floatingRockGlow.getComponent(Transform).scale.setAll(0)
    this.floatingRockGlow.setParent(this)

    const startPos = transform.position
    const endPos = new Vector3(startPos.x, startPos.y + 0.25, startPos.z)

    // Move the rock up and down between start and end positions
    this.addComponent(
      new utils.ToggleComponent(
        utils.ToggleState.Off,
        (value: utils.ToggleState) => {
          if (value === utils.ToggleState.On) {
            this.addComponentOrReplace(
              new utils.MoveTransformComponent(
                startPos,
                endPos,
                Math.random() * 2 + 2,
                () => {
                  this.getComponent(utils.ToggleComponent).toggle()
                },
                utils.InterpolationType.EASEQUAD
              )
            )
          } else {
            this.addComponentOrReplace(
              new utils.MoveTransformComponent(
                endPos,
                startPos,
                Math.random() * 2 + 2,
                () => {
                  this.getComponent(utils.ToggleComponent).toggle()
                },
                utils.InterpolationType.EASEQUAD
              )
            )
          }
        }
      )
    )
    this.getComponent(utils.ToggleComponent).toggle()
  }

  toggleGlow(isOn: boolean): void {
    if (isOn) {
      this.floatingRockGlow.getComponent(Transform).scale.setAll(1)
    } else {
      this.floatingRockGlow.getComponent(Transform).scale.setAll(0)
    }
  }
}
