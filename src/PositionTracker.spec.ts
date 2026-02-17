import { PositionTracker } from "./PositionTracker";

describe("PositionTracker", () => {
    it("should track positions", () => {
        const tracker = new PositionTracker();

        tracker.push("asdf\nasdf\nfdsa");
        expect(tracker.getPosition(1)).toEqual({ line: 1, column: 2 });
        expect(tracker.getPosition(3)).toEqual({ line: 1, column: 4 });
        expect(tracker.getPosition(4)).toEqual({ line: 2, column: 1 });
        expect(tracker.getPosition(5)).toEqual({ line: 2, column: 2 });

        expect(tracker.getPosition(10)).toEqual({ line: 3, column: 2 });
    });

    it("should track positions across multiple chunks", () => {
        const tracker = new PositionTracker();

        tracker.push("asdf\nas");
        tracker.push("df\nfdsa");
        expect(tracker.getPosition(1)).toEqual({ line: 1, column: 2 });
        expect(tracker.getPosition(3)).toEqual({ line: 1, column: 4 });
        expect(tracker.getPosition(4)).toEqual({ line: 2, column: 1 });
        expect(tracker.getPosition(5)).toEqual({ line: 2, column: 2 });
        expect(tracker.getPosition(10)).toEqual({ line: 3, column: 2 });
    });

    it("should throw an error if the index is smaller than the previous one", () => {
        const tracker = new PositionTracker();

        expect(tracker.getPosition(5)).toEqual({ line: 1, column: 6 });
        expect(() => tracker.getPosition(4)).toThrow(
            "Indices must monotonically increase"
        );
    });
});
