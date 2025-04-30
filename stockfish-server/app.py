from flask import Flask, request, jsonify
from stockfish import Stockfish
import os
import math
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

# Get Stockfish path from environment variable, default for Docker container
STOCKFISH_PATH = os.environ.get("STOCKFISH_PATH", "/usr/local/bin/stockfish")

# Initialize Stockfish
try:
    # You might need to adjust parameters based on your system resources
    # Default parameters: depth=15, threads=1, hash=16
    stockfish = Stockfish(path=STOCKFISH_PATH, depth=15, parameters={"Threads": 2, "Hash": 128})
    app.logger.info(f"Stockfish initialized successfully from: {STOCKFISH_PATH}")
    app.logger.info(f"Stockfish parameters: {stockfish.get_parameters()}")
except Exception as e:
    app.logger.error(f"Failed to initialize Stockfish: {e}")
    stockfish = None # Indicate failure

def cp_to_win_prob(cp):
    """Convert centipawn evaluation to win probability (simplified)."""
    # Avoid division by zero or large exponents
    try:
        # Clamp cp value to prevent extreme results from exp
        clamped_cp = max(-2000, min(2000, cp)) # Clamp between -20 and +20 pawns
        return 1 / (1 + math.exp(-0.004 * clamped_cp))
    except OverflowError:
        return 1.0 if cp > 0 else 0.0 # Return 100% or 0% if overflow occurs

@app.route('/')
def index():
    if stockfish:
        return f"Stockfish UCI server running. Engine: {STOCKFISH_PATH}"
    else:
        return "Stockfish UCI server failed to initialize engine.", 500

@app.route('/analyze', methods=['POST'])
def analyze_position():
    if not stockfish:
        return jsonify({"success": False, "error": "Stockfish engine not initialized"}), 500

    data = request.get_json()
    fen = data.get("fen") # Expect a single FEN string
    depth = data.get("depth") # Optional depth override

    # Check if 'fen' is provided and is a string
    if not fen or not isinstance(fen, str):
        return jsonify({"success": False, "error": "FEN string ('fen') not provided or not a string"}), 400

    original_depth = stockfish.depth # Store original depth

    # Set depth if provided and valid
    valid_depth = original_depth # Default to original
    if depth is not None:
        try:
            requested_depth = int(depth)
            # Keep MAX_ANALYSIS_DEPTH limit if desired, e.g., 15 or 20
            MAX_ANALYSIS_DEPTH = 15 # Define a reasonable max depth
            if 1 <= requested_depth <= MAX_ANALYSIS_DEPTH:
                valid_depth = requested_depth
                app.logger.info(f"Using requested depth: {valid_depth}")
            else:
                app.logger.warning(f"Invalid depth requested ({depth}), must be between 1 and {MAX_ANALYSIS_DEPTH}. Using default: {original_depth}")
                # valid_depth remains original_depth
        except ValueError:
             app.logger.warning(f"Invalid depth format ({depth}), using default: {original_depth}")
             # valid_depth remains original_depth

    # Set the depth for this specific analysis
    stockfish.set_depth(valid_depth)

    try:
        if not stockfish.is_fen_valid(fen):
             app.logger.warning(f"Invalid FEN string provided: {fen}")
             # Reset depth before returning error
             stockfish.set_depth(original_depth)
             return jsonify({
                 "fen": fen,
                 "success": False,
                 "error": "Invalid FEN string provided"
             }), 400 # Return 400 for bad request

        stockfish.set_fen_position(fen)
        current_eval_depth = stockfish.depth # Log the depth being used
        evaluation = stockfish.get_evaluation()
        best_move = stockfish.get_best_move() # Get best move with current depth

        if not best_move:
             app.logger.warning(f"Stockfish returned no best move for FEN: {fen}")
             # Reset depth before returning error
             stockfish.set_depth(original_depth)
             return jsonify({
                 "fen": fen,
                 "success": False,
                 "error": "Stockfish could not determine a best move"
             }), 500 # Internal server issue if SF can't find a move

        result_data = {
            "fen": fen,
            "success": True,
            "evaluation": None,
            "mate": None,
            "bestmove": best_move,
            "continuation": "" # Placeholder
        }

        if evaluation["type"] == "cp":
            result_data["evaluation"] = round(evaluation["value"] / 100.0, 2)
        elif evaluation["type"] == "mate":
            result_data["mate"] = evaluation["value"]
            # Assign a large number for mate evaluation for consistency client-side
            result_data["evaluation"] = 999 if evaluation["value"] > 0 else -999
        else:
             app.logger.error(f"Unknown evaluation type '{evaluation.get('type')}' for FEN: {fen}")
             # Reset depth before returning error
             stockfish.set_depth(original_depth)
             return jsonify({
                 "fen": fen,
                 "success": False,
                 "error": f"Unknown evaluation type: {evaluation.get('type')}"
             }), 500 # Internal server error

        # Reset depth to original default after successful analysis
        stockfish.set_depth(original_depth)
        app.logger.info(f"Analyzed FEN: {fen}, Depth: {current_eval_depth}, Eval: {evaluation}, Best Move: {best_move}")
        return jsonify(result_data) # Return the single result object

    except Exception as e:
        app.logger.error(f"Error during analysis for FEN {fen}: {e}", exc_info=True)
        # Reset depth in case of exception
        stockfish.set_depth(original_depth)
        return jsonify({
            "fen": fen,
            "success": False,
            "error": f"Internal server error during analysis: {e}"
        }), 500

# --- Other Endpoints (Optional - Keep if needed, otherwise remove) ---

@app.route('/move', methods=['POST'])
def get_move():
    if not stockfish: return jsonify({"error": "Stockfish engine not initialized"}), 500
    data = request.get_json()
    fen = data.get("fen")
    if not fen: return jsonify({"error": "FEN not provided"}), 400
    try:
        if not stockfish.is_fen_valid(fen): return jsonify({"error": "Invalid FEN"}), 400
        stockfish.set_fen_position(fen)
        return jsonify({"best_move": stockfish.get_best_move()})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/evaluation', methods=['POST'])
def get_eval():
    if not stockfish: return jsonify({"error": "Stockfish engine not initialized"}), 500
    data = request.get_json()
    fen = data.get("fen")
    if not fen: return jsonify({"error": "FEN not provided"}), 400
    try:
        if not stockfish.is_fen_valid(fen): return jsonify({"error": "Invalid FEN"}), 400
        stockfish.set_fen_position(fen)
        return jsonify(stockfish.get_evaluation())
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/win_chance', methods=['POST'])
def get_win_chance():
    if not stockfish: return jsonify({"error": "Stockfish engine not initialized"}), 500
    data = request.get_json()
    fen = data.get("fen")
    if not fen: return jsonify({"error": "FEN not provided"}), 400
    try:
        if not stockfish.is_fen_valid(fen): return jsonify({"error": "Invalid FEN"}), 400
        stockfish.set_fen_position(fen)
        eval_data = stockfish.get_evaluation()
        if eval_data["type"] == "cp":
            prob = cp_to_win_prob(eval_data["value"])
            return jsonify({"white_win_chance": round(prob, 4)})
        elif eval_data["type"] == "mate":
            return jsonify({"white_win_chance": 1.0 if eval_data["value"] > 0 else 0.0})
        else:
            return jsonify({"error": "Unknown evaluation type"}), 400
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/is_move_legal', methods=['POST'])
def check_move_legal():
    if not stockfish: return jsonify({"error": "Stockfish engine not initialized"}), 500
    data = request.get_json()
    fen = data.get("fen")
    move = data.get("move")
    if not fen or not move: return jsonify({"error": "FEN or move not provided"}), 400
    try:
        if not stockfish.is_fen_valid(fen): return jsonify({"error": "Invalid FEN"}), 400
        stockfish.set_fen_position(fen)
        return jsonify({"is_legal": stockfish.is_move_correct(move)})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/top_moves', methods=['POST'])
def get_top_moves():
    if not stockfish: return jsonify({"error": "Stockfish engine not initialized"}), 500
    data = request.get_json()
    fen = data.get("fen")
    n = int(data.get("n", 3))
    if not fen: return jsonify({"error": "FEN not provided"}), 400
    try:
        if not stockfish.is_fen_valid(fen): return jsonify({"error": "Invalid FEN"}), 400
        stockfish.set_fen_position(fen)
        return jsonify({"top_moves": stockfish.get_top_moves(n)})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/set_skill', methods=['POST'])
def set_skill_level():
    if not stockfish: return jsonify({"error": "Stockfish engine not initialized"}), 500
    data = request.get_json()
    level = data.get("level")
    if level is None: return jsonify({"error": "Skill level not provided"}), 400
    try:
        level = int(level)
        if not 0 <= level <= 20:
            return jsonify({"error": "Skill level must be between 0 and 20"}), 400
        stockfish.set_skill_level(level)
        return jsonify({"message": f"Skill level set to {level}"})
    except ValueError:
        return jsonify({"error": "Invalid skill level format"}), 400
    except Exception as e: return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Ensure the app runs on host 0.0.0.0 and port 5000
    app.run(host='0.0.0.0', port=5000)
