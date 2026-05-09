from pathlib import Path

from build123d import (
    Align,
    Box,
    Color,
    Compound,
    Cylinder,
    Rotation,
    export_gltf,
    export_step,
    export_stl,
)


OUT_DIR = Path("output")


WOOD = Color(0.48, 0.24, 0.11)
WOOD_DARK = Color(0.26, 0.13, 0.06)
WOOD_MID = Color(0.38, 0.19, 0.09)
WOOD_LIGHT = Color(0.68, 0.39, 0.18)
SHADOW = Color(0.12, 0.07, 0.04)
BRASS = Color(0.86, 0.69, 0.34)
DARK_BRASS = Color(0.50, 0.38, 0.17)


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


def panel_frame(
    x: float,
    z: float,
    outer_w: float,
    outer_h: float,
    strip: float,
    y: float,
    label_prefix: str,
    color: Color = WOOD_DARK,
):
    return [
        box(outer_w, 6, strip, (x, y, z + outer_h / 2 - strip / 2), f"{label_prefix} top rail", color),
        box(outer_w, 6, strip, (x, y, z - outer_h / 2 + strip / 2), f"{label_prefix} bottom rail", color),
        box(strip, 6, outer_h, (x - outer_w / 2 + strip / 2, y, z), f"{label_prefix} left stile", color),
        box(strip, 6, outer_h, (x + outer_w / 2 - strip / 2, y, z), f"{label_prefix} right stile", color),
    ]


def add_panel(parts: list, x: float, z: float, outer_w: float, outer_h: float, label: str, front_y: float) -> None:
    add_box(parts, outer_w - 112, 4, outer_h - 112, (x, front_y + 1.5, z), f"{label} recessed field", Color(0.31, 0.15, 0.07))
    parts.extend(panel_frame(x, z, outer_w, outer_h, 42, front_y + 6, f"{label} raised frame", WOOD_DARK))
    parts.extend(panel_frame(x, z, outer_w - 70, outer_h - 70, 18, front_y + 10, f"{label} inner bevel", WOOD_LIGHT))
    parts.extend(panel_frame(x, z, outer_w - 126, outer_h - 126, 12, front_y + 13, f"{label} shadow bead", SHADOW))


def add_hinge(parts: list, x: float, y: float, z: float, index: int) -> None:
    add_box(parts, 34, 8, 154, (x + 15, y + 8, z), f"hinge {index} door leaf", DARK_BRASS)
    add_box(parts, 34, 8, 154, (x - 18, y + 8, z), f"hinge {index} jamb leaf", DARK_BRASS)

    for offset, height in ((-54, 42), (0, 38), (54, 42)):
        add_cylinder(parts, 16, height, (x, y, z + offset), f"hinge {index} barrel knuckle", BRASS)

    add_cylinder(parts, 8, 122, (x, y, z), f"hinge {index} center pin", Color(0.92, 0.78, 0.42))
    for screw_x in (x - 18, x + 15):
        for screw_z in (z - 50, z + 50):
            add_cylinder(parts, 5.5, 5, (screw_x, y + 13, screw_z), f"hinge {index} screw head", BRASS, (90, 0, 0))


def add_handle_set(parts: list, handle_x: float, y: float, z: float, door_thickness: float) -> None:
    add_box(parts, 78, 8, 250, (handle_x, y + 5, z), "brass escutcheon plate", DARK_BRASS)
    add_cylinder(parts, 22, 10, (handle_x, y + 12, z + 98), "deadbolt thumb turn", BRASS, (90, 0, 0))
    add_cylinder(parts, 15, 12, (handle_x, y + 12, z - 90), "key cylinder", BRASS, (90, 0, 0))
    add_cylinder(parts, 30, 24, (handle_x, y + 18, z), "round lever rose", BRASS, (90, 0, 0))
    add_cylinder(parts, 13, 178, (handle_x - 78, y + 18, z), "curved brass lever", BRASS, (0, 90, 0))
    add_cylinder(parts, 19, 24, (handle_x - 168, y + 18, z), "lever rounded end", BRASS, (90, 0, 0))
    add_cylinder(parts, 12, door_thickness + 20, (handle_x, 0, z), "latch spindle", DARK_BRASS, (90, 0, 0))
    add_box(parts, 18, 8, 88, (450 + 3, 0, z), "visible latch plate", BRASS)


def add_wood_grain(parts: list, door_width: float, front_y: float) -> None:
    for idx, x in enumerate((-350, -270, -190, -104, -26, 58, 142, 228, 318), start=1):
        add_box(parts, 7, 2.5, 1910, (x, front_y + 15, 1060), f"vertical wood grain {idx}", Color(0.42, 0.20, 0.09))
    for idx, z in enumerate((305, 600, 905, 1245, 1585, 1890), start=1):
        add_box(parts, door_width - 110, 2.5, 5, (0, front_y + 16, z), f"subtle cross grain {idx}", Color(0.58, 0.29, 0.13))


def make_door() -> Compound:
    door_width = 900
    door_height = 2100
    door_thickness = 42
    frame_width = 86
    frame_depth = 96
    frame_overhead = 70

    front_y = door_thickness / 2 + 3
    parts = [
        box(door_width, door_thickness, door_height, (0, 0, door_height / 2), "solid walnut door slab", WOOD),
        box(frame_width, frame_depth, door_height + frame_overhead, (-(door_width / 2 + frame_width / 2), 0, (door_height + frame_overhead) / 2), "left jamb", WOOD_DARK),
        box(frame_width, frame_depth, door_height + frame_overhead, ((door_width / 2 + frame_width / 2), 0, (door_height + frame_overhead) / 2), "right jamb", WOOD_DARK),
        box(door_width + frame_width * 2, frame_depth, frame_width, (0, 0, door_height + frame_width / 2), "head jamb", WOOD_DARK),
    ]

    # Casing, stops, threshold, and shadow reveals make the opening read as a real assembly.
    add_box(parts, 48, 40, door_height + 230, (-(door_width / 2 + frame_width + 34), front_y - 10, (door_height + 110) / 2), "left front casing", WOOD_MID)
    add_box(parts, 48, 40, door_height + 230, ((door_width / 2 + frame_width + 34), front_y - 10, (door_height + 110) / 2), "right front casing", WOOD_MID)
    add_box(parts, door_width + frame_width * 2 + 120, 40, 48, (0, front_y - 10, door_height + frame_width + 42), "top front casing", WOOD_MID)
    add_box(parts, 18, 16, door_height - 30, (-(door_width / 2 + 8), front_y + 6, door_height / 2), "left door stop", WOOD_LIGHT)
    add_box(parts, 18, 16, door_height - 30, ((door_width / 2 + 8), front_y + 6, door_height / 2), "right door stop", WOOD_LIGHT)
    add_box(parts, door_width + 36, 16, 18, (0, front_y + 6, door_height - 8), "head door stop", WOOD_LIGHT)

    add_panel(parts, 0, 610, 700, 690, "lower panel", front_y)
    add_panel(parts, 0, 1465, 700, 760, "upper panel", front_y)
    add_wood_grain(parts, door_width, front_y)

    add_box(parts, door_width - 90, 3, 8, (0, front_y + 14, 1040), "subtle lock rail shadow line", SHADOW)
    add_box(parts, door_width - 90, 3, 8, (0, front_y + 14, 140), "bottom rail shadow line", SHADOW)
    add_box(parts, door_width - 90, 3, 8, (0, front_y + 14, door_height - 70), "top rail shadow line", SHADOW)

    for idx, z in enumerate((360, 1050, 1740), start=1):
        add_hinge(parts, -(door_width / 2 + 18), -(door_thickness / 2 + 16), z, idx)

    handle_x = door_width / 2 - 120
    handle_z = 1010
    add_handle_set(parts, handle_x, door_thickness / 2, handle_z, door_thickness)
    add_cylinder(parts, 18, 10, (0, front_y + 18, 1680), "brass peephole", BRASS, (90, 0, 0))
    add_cylinder(parts, 7, 13, (0, front_y + 24, 1680), "dark peephole glass", Color(0.04, 0.05, 0.06), (90, 0, 0))

    model = Compound(children=parts, label="parametric door")
    return model


def main() -> None:
    OUT_DIR.mkdir(exist_ok=True)
    model = make_door()
    export_gltf(model, OUT_DIR / "door_model.glb", binary=True)
    export_step(model, OUT_DIR / "door_model.step")
    export_stl(model, OUT_DIR / "door_model.stl")
    print(f"Wrote {OUT_DIR / 'door_model.glb'}")
    print(f"Wrote {OUT_DIR / 'door_model.step'}")
    print(f"Wrote {OUT_DIR / 'door_model.stl'}")


if __name__ == "__main__":
    main()
