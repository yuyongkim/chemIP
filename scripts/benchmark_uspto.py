import time
import gzip
import io
import random
import string

def generate_dummy_data(size_mb=10):
    """
    Generate dummy text data with some chemical terms mixed in.
    """
    print(f"Generating {size_mb}MB of dummy data...")
    terms = ["Benzene", "Poly(oxy-1,2-ethanediyl)", "Toluene", "Water", "Sodium Chloride"]
    
    buffer = io.BytesIO()
    # Write roughly size_mb
    target_bytes = size_mb * 1024 * 1024
    written = 0
    
    with gzip.GzipFile(fileobj=buffer, mode='wb') as f:
        while written < target_bytes:
            # Generate a random sentence
            sentence = ''.join(random.choices(string.ascii_letters + " ", k=100))
            # Insert a chemical term occasionally
            if random.random() < 0.1:
                sentence += " " + random.choice(terms) + " "
            
            line = (sentence + "\n").encode('utf-8')
            f.write(line)
            written += len(line)
            
    buffer.seek(0)
    return buffer

def benchmark_processing(buffer):
    """
    Measure how fast we can read and search for keywords.
    """
    print("Starting benchmark...")
    start_time = time.time()
    processed_bytes = 0
    found_count = 0
    
    # Simple keyword matching (simulating EntityMatcher)
    keywords = {"Benzene", "Toluene", "Poly(oxy-1,2-ethanediyl)"}
    
    with gzip.GzipFile(fileobj=buffer, mode='rb') as f:
        for line in f:
            text = line.decode('utf-8', errors='ignore')
            processed_bytes += len(line)
            
            # Simulation of entity matching
            for kw in keywords:
                if kw in text:
                    found_count += 1
                    
    end_time = time.time()
    duration = end_time - start_time
    
    mb_processed = processed_bytes / (1024 * 1024)
    speed_mb_s = mb_processed / duration
    
    return speed_mb_s, found_count

if __name__ == "__main__":
    # 1. Generate 50MB of dummy compressed data
    data_size = 50
    dummy_gz = generate_dummy_data(data_size)
    
    # 2. Benchmark
    speed, count = benchmark_processing(dummy_gz)
    
    print(f"\n=== Benchmark Results ===")
    print(f"Processed: {data_size} MB")
    print(f"Speed: {speed:.2f} MB/s")
    print(f"Matches found: {count}")
    
    # 3. Estimate for 1.6TB
    total_size_tb = 1.6
    total_size_mb = total_size_tb * 1024 * 1024
    estimated_seconds = total_size_mb / speed
    estimated_hours = estimated_seconds / 3600
    
    print(f"\n=== Estimation for 1.6TB ===")
    print(f"Estimated Time: {estimated_hours:.2f} hours")
    print(f"NOTE: This is raw processing time. Indexing DB writes will add overhead.")
