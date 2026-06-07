import unittest

from build123d import Box, Compound

from build_models import validate_shape


class FakeShape:
    def __init__(self, solids, is_valid):
        self._solids = solids
        self.is_valid = is_valid

    def solids(self):
        return self._solids


class FakeSolid:
    def __init__(self, is_valid):
        self.is_valid = is_valid


class ShapeValidationTests(unittest.TestCase):
    def test_accepts_single_solid(self):
        validate_shape("single", Box(10, 10, 10))

    def test_accepts_multi_solid_compound(self):
        first = Box(10, 10, 10)
        second = Box(10, 10, 10).translate((20, 0, 0))

        validate_shape("assembly", Compound([first, second]))

    def test_rejects_empty_shape(self):
        with self.assertRaisesRegex(ValueError, "returned an empty shape"):
            validate_shape("empty", FakeShape([], True))

    def test_rejects_invalid_shape(self):
        solid = Box(10, 10, 10)
        with self.assertRaisesRegex(ValueError, "generated shape is not valid"):
            validate_shape("invalid", FakeShape([solid], False))

    def test_rejects_invalid_solid_in_assembly(self):
        with self.assertRaisesRegex(ValueError, "contains an invalid solid"):
            validate_shape("invalid_assembly", FakeShape([FakeSolid(False)], True))


if __name__ == "__main__":
    unittest.main()
