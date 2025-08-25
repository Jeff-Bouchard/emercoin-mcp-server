import sys

def clean_text(text):
    # Replace literal \r\n with actual line breaks
    return text.replace('\\n', '\n')

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # If argument provided, use it as input
        text = sys.argv[1]
        print(clean_text(text))
    else:
        # If no argument, read from stdin
        text = sys.stdin.read()
        print(clean_text(text))