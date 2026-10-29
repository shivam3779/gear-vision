import cv2
from ultralytics import YOLO
import os

# 1. Load your trained AI brain
model = YOLO('best.pt')

print("=== Gear Defect Image Analyzer ===")
image_path = input("Enter the full path to your gear image (e.g., C:/Downloads/gear.jpg): ")

# Remove quotes if you accidentally copied them with the path
image_path = image_path.strip('"').strip("'")

if not os.path.exists(image_path):
    print(f"Error: Could not find the image at {image_path}")
else:
    # 2. Run the AI on the image (lowered confidence so it doesn't miss subtle defects)
    print("\nAnalyzing image...")
    results = model(image_path, conf=0.15)

    # 3. Print the detailed report to the console
    for r in results:
        boxes = r.boxes
        print("\n" + "="*30)
        print("📊 DETAILED EVALUATION REPORT")
        print("="*30)
        
        if len(boxes) == 0:
            print("✅ Status: PERFECT GEAR")
            print("No defects were found on this gear.")
        else:
            print(f"⚠️ Status: DAMAGED GEAR")
            print(f"Total defects found: {len(boxes)}\n")
            
            # Go through each defect found and print its details
            for idx, box in enumerate(boxes):
                class_id = int(box.cls[0])           # Get the ID of the defect (0, 1, or 2)
                class_name = model.names[class_id]   # Convert ID to name (scratch, break, lack)
                confidence = float(box.conf[0])      # Get how confident the AI is
                
                print(f"  Defect #{idx + 1}: {class_name.upper()}")
                print(f"  Confidence:  {confidence * 100:.1f}% sure")
                print("-" * 30)

        # 4. Draw the boxes and SAVE the image (popup windows crash on some laptops)
        annotated_image = r.plot()
        output_path = "analyzed_" + os.path.basename(image_path)
        cv2.imwrite(output_path, annotated_image)
        
        print(f"\n📸 SUCCESS! The AI has drawn boxes on the image and saved it as: {output_path}")
        print("Check your MDM Minor Project folder to see the result!")
