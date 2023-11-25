"""
A ver si puedo correr los tests de manera más fácil.
"""

import os
import sys
import re

version_pattern = re.compile(r"^\d+(\.\d+)+$")


def is_valid_version(version):
    return bool(version_pattern.match(version))


ECHIDNA_COMMAND = "echidna test/fuzzTests/ConsorcioFuzzTest.sol  --contract ConsorcioTest --config test/fuzzTests/config.yaml"
HARDHAT_COMMAND = "npx hardhat test"

echidna_is_installed = os.popen("echidna --version").read().startswith("Echidna")
hardhat_is_installed = is_valid_version(os.popen("npx hardhat --version").read())


def not_installed_message(tool):
    return f"Could not run {tool}. It is not installed."


def run_hardhat():
    if hardhat_is_installed:
        os.system(HARDHAT_COMMAND)
    else:
        print(not_installed_message("Hardhat"))


def run_echidna():
    if echidna_is_installed:
        os.system(ECHIDNA_COMMAND)
    else:
        print(not_installed_message("Echidna"))


def run_tests(test_type=None):
    if test_type == "fuzz":
        print("Running fuzz tests...")
        run_echidna()
    elif test_type == "unit":
        print("Running unit tests...")
        run_hardhat()
    elif test_type == "both":
        print("Running both unit and fuzz tests...")
        run_hardhat()
        run_echidna()
    else:
        print('Invalid parameter. Please use "fuzz" or "unit".')


if __name__ == "__main__":
    # Parameters can be either "fuzz" or "unit". By default, if none is passed, we run both.
    test_type = "both"
    if len(sys.argv) > 1:
        test_type = sys.argv[1]
    run_tests(test_type)
