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


def molding(
    x: float,
    z: float,
    outer_w: float,
    outer_h: float,
    strip: float,
    y: float,
    label_prefix: str,
):
    color = Color(0.42, 0.22, 0.10)
    return [
        box(outer_w, 6, strip, (x, y, z + outer_h / 2 - strip / 2), f"{label_prefix} top rail", color),
        box(outer_w, 6, strip, (x, y, z - outer_h / 2 + strip / 2), f"{label_prefix} bottom rail", color),
        box(strip, 6, outer_h, (x - outer_w / 2 + strip / 2, y, z), f"{label_prefix} left stile", color),
        box(strip, 6, outer_h, (x + outer_w / 2 - strip / 2, y, z), f"{label_prefix} right stile", color),
    ]


def make_door() -> Compound:
    door_width = 900
    door_height = 2100
    door_thickness = 42
    frame_width = 86
    frame_depth = 96
    frame_overhead = 70

    front_y = door_thickness / 2 + 3
    parts = [
        box(door_width, door_thickness, door_height, (0, 0, door_height / 2), "door slab", Color(0.50, 0.26, 0.12)),
        box(frame_width, frame_depth, door_height + frame_overhead, (-(door_width / 2 + frame_width / 2), 0, (door_height + frame_overhead) / 2), "left jamb", Color(0.34, 0.18, 0.09)),
        box(frame_width, frame_depth, door_height + frame_overhead, ((door_width / 2 + frame_width / 2), 0, (door_height + frame_overhead) / 2), "right jamb", Color(0.34, 0.18, 0.09)),
        box(door_width + frame_width * 2, frame_depth, frame_width, (0, 0, door_height + frame_width / 2), "head jamb", Color(0.34, 0.18, 0.09)),
    ]

    parts.extend(molding(0, 650, 690, 720, 42, front_y, "lower panel"))
    parts.extend(molding(0, 1510, 690, 620, 42, front_y, "upper panel"))

    for idx, z in enumerate((360, 1050, 1740), start=1):
        parts.append(
            cylinder(
                18,
                135,
                (-(door_width / 2 + 18), -(door_thickness / 2 + 10), z),
                f"hinge {idx}",
                Color(0.78, 0.65, 0.36),
            )
        )

    handle_x = door_width / 2 - 120
    handle_z = 1010
    parts.extend(
        [
            cylinder(37, 30, (handle_x, door_thickness / 2 + 17, handle_z), "front knob", Color(0.82, 0.68, 0.38), (90, 0, 0)),
            cylinder(26, door_thickness + 18, (handle_x, 0, handle_z), "latch spindle", Color(0.70, 0.56, 0.31), (90, 0, 0)),
            box(150, 8, 235, (handle_x, door_thickness / 2 + 5, handle_z), "backplate", Color(0.72, 0.58, 0.32)),
        ]
    )

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
