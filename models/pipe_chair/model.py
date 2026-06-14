from __future__ import annotations

from build123d import (
    Align,
    BuildLine,
    BuildPart,
    BuildSketch,
    Color,
    Compound,
    Cylinder,
    FilletPolyline,
    Line,
    Locations,
    Mode,
    Plane,
    RectangleRounded,
    RegularPolygon,
    Vector,
    extrude,
    sweep,
)


MODEL = {
    "id": "pipe_chair",
    "name": "Folding Pipe Chair",
    "description": "A full-size folding meeting chair with tubular steel frames, padded panels, pivots, and foot caps.",
}


FRAME_COLOR = Color(0.68, 0.71, 0.73)
UPHOLSTERY_COLOR = Color(0.08, 0.10, 0.12)
HARDWARE_COLOR = Color(0.35, 0.37, 0.39)
CAP_COLOR = Color(0.05, 0.05, 0.05)


def _tube(
    points: list[tuple[float, float, float]],
    radius: float,
    bend_radius: float | None = None,
):
    with BuildLine() as l:
        if bend_radius is None:
            Line(points[0], points[1])
        else:
            FilletPolyline(*points, radius=bend_radius)

    tangent = Vector(l.line % 0).normalized()
    profile_x = (0, 1, 0) if abs(tangent.X) > 0.9 else (1, 0, 0)
    start_plane = Plane(origin=l.line @ 0, x_dir=profile_x, z_dir=tangent)
    with BuildSketch(start_plane) as s:
        RegularPolygon(radius, side_count=24)

    with BuildPart() as p:
        sweep(s.sketch, path=l.line)
    return p.part


def _rounded_panel(
    width: float,
    depth: float,
    thickness: float,
    radius: float,
    center: tuple[float, float, float],
):
    with BuildSketch(Plane.XY) as s:
        RectangleRounded(width, depth, radius)
    with BuildPart() as p:
        extrude(s.sketch, amount=thickness)
    panel = p.part.translate((center[0], center[1], center[2] - thickness / 2))
    return panel


def _back_panel():
    back_plane = Plane(origin=(0, 77, 690), x_dir=(1, 0, 0), z_dir=(0, -1, 0))
    with BuildSketch(back_plane) as s:
        RectangleRounded(390, 135, 28)
    with BuildPart() as p:
        extrude(s.sketch, amount=34)
    return p.part


def _pivot_hardware():
    with BuildPart() as p:
        with Locations((-221, 31, 438), (221, 31, 438)):
            Cylinder(
                radius=15,
                height=18,
                rotation=(0, 90, 0),
                align=(Align.CENTER, Align.CENTER, Align.CENTER),
            )
    return p.part


def _foot_caps():
    cap_segments = [
        ((-207, -210, 13), (-199, -181, 75)),
        ((207, -210, 13), (199, -181, 75)),
        ((-207, 210, 13), (-199, 185, 72)),
        ((207, 210, 13), (199, 185, 72)),
    ]
    return [_tube([start, end], radius=13.2) for start, end in cap_segments]


def build_model():
    frame_parts = []

    # Main side members run continuously from each front foot to the backrest.
    for x in (-207, 207):
        frame_parts.append(
            _tube(
                [
                    (x, -210, 14),
                    (x, -132, 230),
                    (x, -26, 438),
                    (x, 39, 615),
                    (x, 67, 772),
                ],
                radius=11,
                bend_radius=48,
            )
        )

    # Rear support members cross the main frame at the folding pivots.
    for x in (-207, 207):
        frame_parts.append(
            _tube(
                [
                    (x, 210, 14),
                    (x, 145, 210),
                    (x, 31, 438),
                    (x, -47, 461),
                ],
                radius=11,
                bend_radius=42,
            )
        )

    frame_parts.extend(
        [
            _tube([(-207, 67, 772), (207, 67, 772)], radius=11),
            _tube([(-207, 178, 92), (207, 178, 92)], radius=10),
            _tube([(-190, -125, 238), (190, -125, 238)], radius=8),
            _tube([(-190, 76, 424), (190, 76, 424)], radius=8),
        ]
    )

    seat = _rounded_panel(
        width=420,
        depth=365,
        thickness=36,
        radius=32,
        center=(0, -31, 448),
    )
    back = _back_panel()
    pivots = _pivot_hardware()
    caps = _foot_caps()

    for part in frame_parts:
        part.color = FRAME_COLOR
    seat.color = UPHOLSTERY_COLOR
    back.color = UPHOLSTERY_COLOR
    pivots.color = HARDWARE_COLOR
    for cap in caps:
        cap.color = CAP_COLOR

    return Compound(children=[*frame_parts, seat, back, pivots, *caps])
