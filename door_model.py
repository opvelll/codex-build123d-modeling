from pathlib import Path

from build123d import Align, Box, Color, Compound, Cylinder, Rotation, export_gltf, export_step, export_stl


OUT_DIR = Path("output")


OAK = Color(0.72, 0.49, 0.27)
OAK_DARK = Color(0.42, 0.25, 0.12)
OAK_LIGHT = Color(0.86, 0.66, 0.38)
SHADOW = Color(0.18, 0.12, 0.07)
FELT = Color(0.05, 0.06, 0.055)


def box(
    length: float,
    width: float,
    height: float,
    at: tuple[float, float, float],
    label: str,
    color: Color,
):
    shape = Box(length, width, height, align=(Align.CENTER, Align.CENTER, Align.CENTER))
    shape.translate(at)
    shape.label = label
    shape.color = color
    return shape


def add_box(
    parts: list,
    length: float,
    width: float,
    height: float,
    at: tuple[float, float, float],
    label: str,
    color: Color,
) -> None:
    parts.append(box(length, width, height, at, label, color))


def cylinder(
    radius: float,
    height: float,
    at: tuple[float, float, float],
    label: str,
    color: Color,
    rotation: tuple[float, float, float] = (0, 0, 0),
):
    shape = Cylinder(
        radius,
        height,
        rotation=Rotation(*rotation),
        align=(Align.CENTER, Align.CENTER, Align.CENTER),
    )
    shape.translate(at)
    shape.label = label
    shape.color = color
    return shape


def add_cylinder(
    parts: list,
    radius: float,
    height: float,
    at: tuple[float, float, float],
    label: str,
    color: Color,
    rotation: tuple[float, float, float] = (0, 0, 0),
) -> None:
    parts.append(cylinder(radius, height, at, label, color, rotation))


def add_seat(parts: list) -> None:
    add_box(parts, 520, 470, 44, (0, 0, 470), "single slab seat", OAK)
    add_box(parts, 550, 30, 50, (0, -250, 448), "front rounded seat lip", OAK_LIGHT)
    add_box(parts, 550, 26, 42, (0, 250, 450), "rear seat rail", OAK_DARK)
    add_box(parts, 28, 470, 38, (-275, 0, 450), "left seat edge band", OAK_DARK)
    add_box(parts, 28, 470, 38, (275, 0, 450), "right seat edge band", OAK_DARK)

    for idx, x in enumerate((-205, -105, 0, 110, 215), start=1):
        add_box(parts, 6, 430, 3, (x, -4, 494), f"subtle seat grain {idx}", OAK_DARK)


def add_legs(parts: list) -> None:
    leg_positions = [
        (-215, -175, "front left leg"),
        (215, -175, "front right leg"),
        (-215, 175, "rear left leg"),
        (215, 175, "rear right leg"),
    ]

    for x, y, label in leg_positions:
        add_box(parts, 46, 46, 445, (x, y, 222), label, OAK_DARK)
        add_box(parts, 54, 54, 18, (x, y, 9), f"{label} felt foot", FELT)

    add_box(parts, 470, 34, 42, (0, -178, 325), "front apron", OAK_DARK)
    add_box(parts, 470, 34, 42, (0, 178, 325), "rear apron", OAK_DARK)
    add_box(parts, 34, 365, 42, (-218, 0, 325), "left side apron", OAK_DARK)
    add_box(parts, 34, 365, 42, (218, 0, 325), "right side apron", OAK_DARK)

    add_cylinder(parts, 13, 430, (0, -177, 215), "front round stretcher", OAK_LIGHT, (0, 90, 0))
    add_cylinder(parts, 13, 430, (0, 177, 215), "rear round stretcher", OAK_LIGHT, (0, 90, 0))
    add_cylinder(parts, 12, 350, (-218, 0, 185), "left side round stretcher", OAK_LIGHT, (90, 0, 0))
    add_cylinder(parts, 12, 350, (218, 0, 185), "right side round stretcher", OAK_LIGHT, (90, 0, 0))


def add_back(parts: list) -> None:
    add_box(parts, 54, 54, 600, (-215, 206, 755), "left rear back post", OAK_DARK)
    add_box(parts, 54, 54, 600, (215, 206, 755), "right rear back post", OAK_DARK)

    add_box(parts, 490, 42, 70, (0, 214, 980), "plain top back rail", OAK_DARK)
    add_box(parts, 440, 34, 54, (0, 212, 730), "lower back rail", OAK_DARK)
    add_box(parts, 390, 20, 150, (0, 224, 855), "simple inset back panel", OAK_LIGHT)

    for idx, x in enumerate((-150, -75, 0, 75, 150), start=1):
        add_box(parts, 36, 30, 300, (x, 214, 845), f"vertical back slat {idx}", OAK)

    add_box(parts, 510, 8, 12, (0, 242, 948), "back rail highlight", OAK_LIGHT)
    add_box(parts, 410, 8, 10, (0, 242, 690), "lower rail shadow line", SHADOW)


def make_chair() -> Compound:
    parts = []
    add_seat(parts)
    add_legs(parts)
    add_back(parts)
    return Compound(children=parts, label="simple wooden chair")


def main() -> None:
    OUT_DIR.mkdir(exist_ok=True)
    model = make_chair()
    export_gltf(model, OUT_DIR / "door_model.glb", binary=True)
    export_step(model, OUT_DIR / "door_model.step")
    export_stl(model, OUT_DIR / "door_model.stl")
    print(f"Wrote {OUT_DIR / 'door_model.glb'}")
    print(f"Wrote {OUT_DIR / 'door_model.step'}")
    print(f"Wrote {OUT_DIR / 'door_model.stl'}")


if __name__ == "__main__":
    main()
