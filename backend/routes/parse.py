from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import zipfile
import io
from edi_parser import parse
from edi_parser.validator import validate_static

router = APIRouter()

@router.post("/parse")
async def parse_edi(file: UploadFile = File(...)):
    filename = file.filename.lower()
    raw_bytes = await file.read()
    
    if filename.endswith(".zip"):
        results = []
        try:
            with zipfile.ZipFile(io.BytesIO(raw_bytes)) as archive:
                for name in archive.namelist():
                    if name.lower().endswith((".edi", ".txt")):
                        file_bytes = archive.read(name)
                        try:
                            raw = file_bytes.decode("utf-8-sig")
                        except UnicodeDecodeError:
                            raw = file_bytes.decode("latin-1")
                        
                        if not raw.strip():
                            continue
                            
                        parsed_res = parse(raw)
                        parsed_res["raw"] = raw
                        val_res = validate_static(parsed_res)
                        
                        results.append({
                            "filename": name,
                            "parsed": parsed_res,
                            "validation": val_res
                        })
            return JSONResponse(content={"batch": True, "results": results})
        except zipfile.BadZipFile:
            raise HTTPException(status_code=400, detail="Invalid ZIP file")
            
    elif filename.endswith((".edi", ".txt")):
        try:
            raw = raw_bytes.decode("utf-8-sig")
        except UnicodeDecodeError:
            raw = raw_bytes.decode("latin-1")

        if not raw.strip():
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        result = parse(raw)
        result["raw"] = raw  
        val_res = validate_static(result)

        status = 207 if result.get("errors") else 200
        return JSONResponse(content={"batch": False, "parsed": result, "validation": val_res}, status_code=status)
    
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload .edi, .txt, or .zip")
