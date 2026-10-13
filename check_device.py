
import torch

print("PyTorch version:", torch.__version__)
print("MPS available:", torch.backends.mps.is_available())

if torch.backends.mps.is_available():
    print("Device: Apple Silicon GPU (MPS)")
else:
    print("Device: CPU")
