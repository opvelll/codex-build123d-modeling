from build123d import Align, Axis, Box, Color, RegularPolygon, extrude


MODEL = {
    "id": "chair",
    "name": "Wooden Chair",
    "description": "A simple low-poly wooden chair built as one solid.",
}

LOW_POLY_SIDES = 12
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
    shape = shape.translate(at)
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
    shape = extrude(RegularPolygon(radius, LOW_POLY_SIDES), amount=height)
    shape = shape.translate((0, 0, -height / 2))
    for axis, angle in zip((Axis.X, Axis.Y, Axis.Z), rotation, strict=True):
        if angle:
            shape = shape.rotate(axis, angle)
    shape = shape.translate(at)
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
    add_box(parts, 550, 34, 42, (0, 238, 450), "rear seat rail", OAK_DARK)
    add_box(parts, 28, 470, 38, (-275, 0, 450), "left seat edge band", OAK_DARK)
    add_box(parts, 28, 470, 38, (275, 0, 450), "right seat edge band", OAK_DARK)

    for idx, x in enumerate((-205, -105, 0, 110, 215), start=1):
        add_box(parts, 6, 430, 6, (x, -4, 491), f"subtle seat grain {idx}", OAK_DARK)


def add_legs(parts: list) -> None:
    leg_positions = [
        (-215, -175, "front left leg"),
        (215, -175, "front right leg"),
        (-215, 175, "rear left leg"),
        (215, 175, "rear right leg"),
    ]

    for x, y, label in leg_positions:
        add_box(parts, 46, 46, 470, (x, y, 235), label, OAK_DARK)
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

    add_box(parts, 510, 12, 12, (0, 230, 948), "back rail highlight", OAK_LIGHT)
    add_box(parts, 410, 12, 10, (0, 225, 690), "lower rail shadow line", SHADOW)


def union_parts(parts: list):
    if not parts:
        raise ValueError("No chair parts were generated")

    model = parts[0]
    for part in parts[1:]:
        model = model.fuse(part)

    model = model.clean()
    model.label = "simple wooden chair union"
    model.color = OAK
    return model


def build_model():
    parts = []
    add_seat(parts)
    add_legs(parts)
    add_back(parts)
    return union_parts(parts)
